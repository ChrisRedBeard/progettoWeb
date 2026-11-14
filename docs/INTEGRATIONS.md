# Contratto delle integrazioni

Camera, voce e diretta non sono implementate qui. L'app parla solo con le interfacce in `src/lib/integrations`. L'implementazione attiva si sceglie con `NEXT_PUBLIC_INTEGRATIONS`:

- `mock` (default): timer, sottotitoli e stream finto, senza microfono e senza rete.
- `real`: `createRealIntegrations()` in `src/lib/integrations/real/bundle.ts`. Oggi lancia `IntegrationError` con codice `NOT_IMPLEMENTED`. Sostituire quel corpo è il passaggio al servizio vero.

```ts
import { getIntegrations } from "@/lib/integrations";

const { pose, voice, room, events } = getIntegrations();
```

I test di contratto stanno in `src/lib/integrations/contract.test.ts`. Girano sull'array `implementations`. Per coprire anche la versione reale, aggiungere una voce a quell'array: i casi non vanno riscritti.

In sviluppo, `/dev/integrations` fa partire i mock e può forzare errore di movimento, tracking perso, coach che parla, cambio privacy e connessione caduta. In produzione il middleware rimanda alla home.

## Regole comuni

Ogni servizio espone `status` (`idle | starting | running | error`), `lastError` e `onStatusChange(listener)`.

Gli errori sono `IntegrationError`, con `code` e `message`. I codici sono `NOT_IMPLEMENTED`, `INVALID_STATE`, `CAMERA_UNAVAILABLE`, `MIC_UNAVAILABLE`, `CONNECTION_LOST`, `TOKEN_EXPIRED`, `NOT_ALLOWED`. Non lanciare `Error` generici e non rifiutare una promise con una stringa.

`onStatusChange` e gli altri ascolti restituiscono una funzione che disiscrive.

### Cosa deve garantire l'implementazione reale

- Nessuna richiesta di camera o microfono all'import del modulo o nel costruttore. Il permesso si chiede solo dentro `start` o `publishLocalStream`, e solo se lo stream non è già stato passato dall'app.
- Permesso negato: `status` diventa `error`, si lancia `IntegrationError` (`CAMERA_UNAVAILABLE` o `MIC_UNAVAILABLE`) e non si riprova in ciclo.
- Riavvio: `stop()` o `leave()` liberano timer, socket e tracce. Una nuova `start` o `join` non ripete ripetizioni, frasi o eventi già consegnati.
- Da `speak()` all'audio udibile passano al massimo 500 ms.
- Da quando il frame fa scattare una regola a `onError` passano al massimo 100 ms. Non accumulare gli errori per inviarli a fine serie.

### Cosa non deve fare

- Non registrare video o audio, in memoria oltre il frame corrente, su disco o su un bucket.
- Non inviare fotogrammi o audio a server diversi dal provider della diretta, e solo per la durata della sessione.
- Non scrivere log con immagini, pose grezze o audio.
- Non salvare nulla che non sia già un dato strutturato deciso dall'app (`SetResult`).

## Errori di movimento

`MovementErrorCode` è `knees_in | back_rounded | depth_insufficient | tempo_too_fast`.

La gravità è `INFO | WARN | CRITICAL`. Il default del mock:

| Codice | Gravità | Frase |
| --- | --- | --- |
| `knees_in` | `WARN` | Ginocchia in dentro. Spingile in linea con i piedi. |
| `back_rounded` | `CRITICAL` | Schiena curva. Fermati e raddrizza il busto. |
| `depth_insufficient` | `WARN` | Scendi un po' di più. |
| `tempo_too_fast` | `INFO` | Rallenta il movimento. |

In `SetResult.errors` lo stesso codice finisce in un array JSON:

```json
[{ "rep": 4, "code": "depth_insufficient", "severity": "WARN", "ignored": true }]
```

`ignored` è `true` quando la voce ha risposto `DEDUPED`. `toStoredMovementError` e `parseStoredMovementErrors` convertono e validano quel formato. Un codice fuori dall'unione è `INVALID_STATE`.

## PoseAnalyzer

Stima la posa dal video già agganciato a un `HTMLVideoElement` e segnala ripetizioni, errori, perdita di inquadratura e punteggio.

### Metodi

- `start(video, exerciseKey, callbacks)` passa da `idle` a `starting` e poi a `running`. `video` nullo o chiave vuota: `error` e `IntegrationError`. Una seconda `start` mentre è `running` lancia `INVALID_STATE` senza cambiare stato.
- `stop()` ferma l'analisi e torna a `idle`. Chiamarla da `idle` non fa nulla.

### Eventi

Callback passate a `start`:

- `onRep(count)` con il conteggio della serie, da 1 in su.
- `onError({ code, severity, repNumber })`.
- `onTrackingLost()` e `onTrackingRecovered()`.
- `onFormScore(score)` con un numero da 0 a 100.

`onStatusChange(status, error)`.

### Esempio

```ts
pose.start(video, "squat", {
  onRep: (count) => console.log(count),
  onError: (error) => voice.speak(movementCue(error.code), error.severity, {
    errorCode: error.code,
    setKey: "set-1",
  }),
  onTrackingLost: () => voice.speak("Torna nell'inquadratura.", "WARN"),
  onTrackingRecovered: () => undefined,
  onFormScore: () => undefined,
});
```

### Garanzie

- Non chiama `getUserMedia` se `video.srcObject` ha già una traccia video.
- Alla perdita del tracking smette di contare ripetizioni finché non arriva `onTrackingRecovered`.
- Al `stop`, scarta il frame corrente e non emette più callback.
- Il mock, con la simulazione attiva, emette una ripetizione ogni 3 secondi, a volte un errore e ogni tanto perde il tracking per un ciclo. I test di contratto disattivano la simulazione e usano i trigger. La versione reale non inventa ripetizioni.

### Non deve fare

- Non registrare il video e non mandare i frame a un server di pose, se il modello può girare sul dispositivo. Se un modello remoto è inevitabile, va documentato prima di collegarlo: questo contratto oggi lo vieta.

## VoiceFeedback

Dice una frase. Il mock non ha audio: mostra la frase come sottotitolo per 4 secondi. La versione reale parla e usa lo stesso stato `speaking` per i sottotitoli, così restano disponibili anche senza audio.

### Metodi

- `speak(text, priority, context?)` con `priority` uguale alla gravità (`INFO | WARN | CRITICAL`). `context` può avere `errorCode` e `setKey` (la serie). Restituisce `{ spoken: true }` oppure `{ spoken: false, reason }`.
- `setMode("FULL" | "CRITICAL_ONLY" | "OFF")`.
- `pause()` e `resume()`.
- `stop()` chiude il sottotitolo o l'audio e porta lo stato a `idle`. Non azzera il conteggio di deduplica: quello è legato a `setKey`.

Risultati di `speak`:

| Reason | Quando |
| --- | --- |
| `EMPTY` | Testo vuoto. |
| `PAUSED` | La voce è in pausa. La frase non viene accodata. |
| `MODE` | Modalità `OFF`, oppure `CRITICAL_ONLY` e priorità non critica. |
| `DEDUPED` | Lo stesso `errorCode` nella stessa `setKey` è già stato detto 3 volte. |

`CRITICAL` non consuma il limite e non viene messo da parte. Senza `errorCode` non c'è deduplica.

### Eventi

- `onSpeakingChange({ speaking, text })`. `text` è la frase in corso, oppure `null` se è finita.
- `onStatusChange`.

### Esempio

```ts
voice.setMode("FULL");
voice.onSpeakingChange((state) => {
  subtitle.textContent = state.text ?? "";
});
const result = voice.speak("Ginocchia in dentro.", "WARN", {
  errorCode: "knees_in",
  setKey: setId,
});
if (!result.spoken && result.reason === "DEDUPED") {
  // Segnare l'errore come ignored nel SetResult.
}
```

Quando la diretta segnala che il coach parla, l'app chiama `pause()`. Quando smette, `resume()`. Non è il modulo voce a sapere della diretta.

### Garanzie

- L'audio parte entro 500 ms da `speak()`, oppure `speak` restituisce un motivo e non parte.
- `stop()` e `pause()` interrompono l'audio subito, anche a metà frase.
- Dopo un riavvio di pagina il conteggio riparte da zero perché vive in memoria. Non si ripete la frase tagliata.
- Il mock nasconde il sottotitolo dopo 4 secondi. La versione reale emette `speaking: false` quando l'audio finisce, non dopo un timer fisso.

### Non deve fare

- Non registrare l'audio generato e non inviarlo a un servizio di log.
- Non parlare di un errore messo da parte, nemmeno riformulato, fino alla serie successiva.

## LiveRoomProvider

Stanza della diretta. Il mock non apre una connessione: rilascia un token locale e, con la simulazione attiva, annuncia un partecipante finto con uno stream disegnato su un canvas. I test disattivano quel partecipante. La versione reale non deve inventare partecipanti.

### Metodi

- `getToken(role, sessionId)` con `role` `coach` o `athlete`. Restituisce `{ token, roomName, expiresAt, publish }`. Il coach ha `publish.video: false`, l'atleta audio e video. `sessionId` vuoto: `INVALID_STATE`. L'app non usa questo token per far entrare il coach: prima chiama `POST /api/live/token`, che ricontrolla lobby, privacy, sessione attiva e scheda assegnata, e passa quel token a `join`.
- `join(room)` con lo stesso oggetto. Può includere `peers` per la griglia: una sola join, un partecipante per cliente. Token sconosciuto, scaduto o bruciato: `TOKEN_EXPIRED` e `status` `error`. Seconda join mentre è `running`: `INVALID_STATE`.
- `refreshToken(room)`. Sostituisce il token della stanza già aperta, senza chiudere i partecipanti e senza interrompere audio e video. Si chiama prima della scadenza. Stanza chiusa: `INVALID_STATE`. Token di un'altra stanza: `INVALID_STATE`. Token scaduto: `TOKEN_EXPIRED` e la stanza si chiude.
- `leave()` esce e torna a `idle`. Da `idle` non fa nulla. Non chiude l'allenamento dell'atleta.
- `publishLocalStream(stream)`. Stream vuoto o non valido: `CAMERA_UNAVAILABLE`. Se il token non consente il video e lo stream ha una traccia video: `NOT_ALLOWED`.
- `subscribe(onParticipant, onStream)`.
- `muteRemote(participantId, muted = true)`. `muted: false` riattiva l'audio. Partecipante sconosciuto: `NOT_ALLOWED`.
- `setQuality(participantId, "low" | "high")`.
- `publishData(payload)`. Il payload è validato con Zod. Se non rispetta lo schema: `INVALID_STATE` e nessun ascolto riceve il dato. Si può chiamare solo a stanza aperta.
- `onData({ participantId, data })`.
- `onCoachPresence({ present, displayName })`. È l'ingresso e l'uscita del coach visti dalla stanza. Il mock non lo emette per il partecipante finto disegnato sul canvas: quel video non è un coach vero. L'atleta vede il coach perché `POST /api/live/token` registra la presenza e la scheda la legge.

### Eventi

- `subscribe`: `onParticipant(participant, "joined" | "left")` e `onStream(participantId, stream | null)`.
- `onRemoteSpeaking({ participantId, speaking })`. Mentre `speaking` è vero l'app mette in pausa la voce dell'analisi.
- `onForcedDisconnect(reason)` con `PRIVACY_ENABLED`, `ATHLETE_LEFT` o `TOKEN_EXPIRED`.
- `onConnectionChange("connected" | "reconnecting" | "disconnected")`.
- `onStatusChange`.

### Canale dati

```ts
type LiveData = {
  repCount: number;
  formScore: number | null;
  error: { code: MovementErrorCode; severity: "INFO" | "WARN" | "CRITICAL" } | null;
  phase: "set" | "recovery";
};
```

`repCount` è un intero maggiore o uguale a zero. `formScore`, se presente, sta tra 0 e 100. Il codice dell'errore è uno di quelli del movimento, e la gravità è quella già associata al codice. Il mock del coach, con la simulazione accesa, emette una serie da 8 ripetizioni (ginocchia in dentro, profondità insufficiente, schiena curva) e poi un fotogramma di recupero. I dati arrivano già formattati: la griglia non interpreta i landmark.

`PRIVACY_ENABLED` e `ATHLETE_LEFT` chiudono la stanza e lasciano `status` a `idle`: è un'uscita prevista. `TOKEN_EXPIRED` lascia `status` a `error` e brucia il token. `CONNECTION_LOST` lascia `status` a `error` ma il token resta valido: l'app può chiamare di nuovo `join` con lo stesso token. L'allenamento non si cancella per questo.

### Esempio

```ts
const token = await room.getToken("coach", sessionId);
await room.join(token);
room.onRemoteSpeaking((event) => {
  if (event.speaking) voice.pause();
  else voice.resume();
});
room.onData((message) => showReps(message.data.repCount, message.data.formScore));
room.publishData({ repCount: 3, formScore: 74, error: { code: "knees_in", severity: "WARN" }, phase: "set" });
room.onForcedDisconnect((reason) => {
  if (reason === "PRIVACY_ENABLED") showNotice("L'atleta ha reso privata la diretta.");
});
const stop = room.subscribe(
  (participant, presence) => updateTile(participant, presence),
  (participantId, stream) => attachVideo(participantId, stream),
);
room.muteRemote(participantId);
```

Se l'atleta attiva `privateLive` mentre il coach è dentro, l'app emette `privacyChanged` e poi la disconnessione `PRIVACY_ENABLED`. Il pannello di debug fa la stessa sequenza.

### Garanzie

- Il token dura al massimo quanto dichiarato in `expiresAt`. L'app ne chiede uno nuovo e chiama `refreshToken` prima della scadenza: la diretta non si interrompe. Se la scadenza arriva comunque: `onForcedDisconnect("TOKEN_EXPIRED")`, si smette di pubblicare, il servizio non rinnova da solo.
- Alla caduta rete: `onConnectionChange("disconnected")`, `status` `error`, codice `CONNECTION_LOST`. Non si continua a inviare media.
- Al riavvio non si riusa un token scaduto. Si chiama di nuovo `getToken`.
- `leave()` chiude le tracce locali pubblicate da questo servizio. Le tracce create dall'app restano di proprietà dell'app.

### Non deve fare

- Non registrare la stanza lato server.
- Non inoltrare media a un secondo servizio di analytics o di registrazione.
- Non far entrare un coach se l'app non ha chiamato `join` con un token appena emesso per quella sessione.

La griglia usa questo canale e una sola `join`. Le miniature chiamano `setQuality(..., "low")`; la tile in primo piano usa `"high"`. L'audio dei clienti nasce muto (`muteRemote`) e se ne riattiva uno solo. Il microfono del coach resta spento. Nella diretta singola si attiva con un tocco o con la barra spaziatrice, e con il mouse si può anche tenere premuto.

## LiveEvents

Flusso degli eventi di sessione verso il coach: inizio, fine, cambio privacy. Non trasporta video.

### Metodi

- `start()` passa a `running`.
- `stop()` torna a `idle`.
- `subscribe(listener)`.

### Eventi

```ts
type LiveSessionEvent =
  | { type: "sessionStarted"; sessionId: string; athleteId: string; at: string }
  | { type: "sessionEnded"; sessionId: string; athleteId: string; at: string }
  | { type: "privacyChanged"; sessionId: string; athleteId: string; privateLive: boolean; at: string };
```

`at` è una data ISO. Emettere mentre il flusso è fermo lancia `INVALID_STATE`. Dopo `unsubscribe`, il listener non riceve più nulla.

### Esempio

```ts
events.start();
const stop = events.subscribe((event) => {
  if (event.type === "sessionStarted") notifyCoach(event.athleteId);
  if (event.type === "privacyChanged" && event.privateLive) disconnectCoach(event.sessionId);
});
```

### Garanzie

- `sessionStarted` arriva una volta per sessione, entro pochi secondi dall'ingresso reale dell'atleta. Non si ripete a ogni riconnessione del coach.
- `sessionEnded` arriva quando l'atleta esce, anche se il coach non era in stanza.
- Alla `subscribe`, si può inviare lo stato privacy corrente una sola volta. Non si ripete uno `sessionStarted` di una sessione già chiusa.
- Il mock non emette nulla da solo: il pannello di debug chiama i trigger. La versione reale emette quando lo stato cambia davvero.

### Non deve fare

- Non includere frame, audio o token della stanza nell'evento.
- Non mandare l'evento a un atleta diverso dal coach della lobby. Chi può ascoltare lo decide l'app, sul server, prima di aprire il flusso.
