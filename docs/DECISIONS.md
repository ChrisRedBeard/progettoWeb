# Decisioni

Scelte prese dove la specifica lasciava un margine. La più semplice, annotata qui.

## Decisioni di prodotto del 20 novembre 2026

Valgono per il modello in `documentazione/` e prevalgono sulle parti di questo file indicate sotto. Dove il codice fa ancora altro, va allineato in un lavoro a parte.

- **Scheda non modificabile.** Una scheda caricata non si modifica: per aggiornarla se ne carica una nuova, con nota e data, e la precedente si chiude. Supera la modifica sul posto di `saveWorkout` e la rimozione con `removedAt` descritte in «Libreria, video e schede».
- **Più schede per atleta.** Un atleta può avere più schede aperte; quella attiva è la scheda che segue nell'allenamento in corso. Assegnare una scheda non chiude le altre. Supera «Un atleta ha una sola scheda attiva».
- **Scheda del coach per un atleta preciso.** Il coach carica ogni scheda per un solo atleta; non esistono schede modello assegnate a più atleti. Oggi `Workout` è un modello del coach con più `WorkoutAssignment`: da allineare.
- **Chiudere un'assegnazione non chiude la scheda.** La scheda resta all'atleta, che può continuare a usarla da solo; il coach smette di seguirla e non entra più nelle dirette su quella scheda. Oggi la pagina `/workout` mostra solo le assegnazioni attive e il token della diretta non controlla se l'assegnazione è aperta: da allineare.
- **Più coach per atleta.** Accettare un invito non chiude le altre appartenenze e non serve la conferma di cambio coach. Uscire da una lobby cambia lo stato dell'appartenenza invece di cancellarla. Supera il cambio coach descritto in «Inviti e lobby» e l'unicità di `Membership.athleteId`.
- **Diretta del coach: resta come nel codice.** Il coach entra solo se la sessione segue una scheda che ha assegnato, con heartbeat recente e privacy spenta.
- **Camera facoltativa.** È fortemente consigliata per il tracking e l'atleta può accenderla o spegnerla in ogni momento; senza camera non ci sono tracking, monitoraggio AI né video. La sessione nasce quando l'atleta preme Inizia: supera «La sessione nasce quando la camera è concessa». Per usare la camera serve sempre il consenso.
- **Privacy per singola diretta.** La modalità privata vale per la diretta in corso e l'atleta la cambia in ogni momento. Oggi `privateLive` sta su `Membership`.
- **Diretta con sola AI.** Si svolge privata e senza conversazione, così l'atleta vede i consigli del tracking.
- **Account cancellabile.** I dati personali si cancellano; restano, anonimi, solo i dati che servono ad altri, come pagamenti e commissioni.
- **Fuori ambito.** Chat, messaggi, tag delle sessioni e ciclo di vita dei modelli AI restano nel modello E-R ma non nell'analisi delle operazioni.

## Next.js 15.5.29

Il progetto partiva da Next 15.2.4, che ha una vulnerabilità nota. Si resta sulla linea 15, all'ultima patch (`15.5.29`), invece di saltare a Next 16. L'App Router e il middleware restano quelli già previsti.

## Prisma 6.19.3

Lo schema fornito usa `url = env("DATABASE_URL")` nel file Prisma. Prisma 7 e 8 (ancora in release candidate sul tag `latest` della CLI) spostano la connessione su `prisma.config.ts` e su un driver adapter. Prisma 6 legge lo schema così com'è.

## Database locale sulla porta 5433

PostgreSQL 18 è già installato e in esecuzione sulla porta 5432, ma l'accesso richiede la password del superutente di sistema. Non la usiamo e non modifichiamo quel cluster.

`npm run db:up` crea un secondo cluster nella cartella `data/postgres` del progetto, con utente `fitai`, database `fitai` e porta `5433`. I binari sono quelli già installati. Il progetto Supabase collegato all'ambiente non c'entra: è un'altra applicazione e non va toccato.

Le credenziali locali stanno in `.env` (non versionato). Sono valide solo su localhost.

## `Session` diventa la sessione di Auth.js

Il modello di allenamento si chiama `WorkoutSession`. Le relazioni sono state rinominate di conseguenza (`workoutSessions`). `Account`, `Session` e `VerificationToken` sono le tabelle richieste dall'adapter Prisma di Auth.js.

## Login con JWT, tabelle sessione comunque presenti

Il provider Credentials di Auth.js v5 funziona con la strategia JWT, non con le sessioni su database. Le tabelle ci sono lo stesso, così lo schema dell'adapter è completo se più avanti si aggiunge un provider OAuth. Il pacchetto è `next-auth@5.0.0-beta.32`: su npm la v5 è ancora etichettata beta, ed è l'API Auth.js richiesta dalla specifica.

`passwordHash` non fa parte dello schema standard di Auth.js: serve per le credenziali email e password. `emailVerified` e `image` sono i campi che l'adapter si aspetta sull'utente.

## `feedbackMode` anche sull'utente

Nello schema originale la modalità del feedback viveva solo sulla sessione di allenamento. Le impostazioni devono ricordarla tra una sessione e l'altra, quindi il valore di default sta su `User`. All'avvio di un allenamento la sessione ne farà una copia. Non è ancora esposto in UI: le impostazioni arrivano nell'ultima fase.

## Plank e le ripetizioni

Non c'è un campo durata separato. Per il plank il seed usa `defaultReps = 30` con la descrizione che quei numeri sono secondi di tenuta. Evita una colonna nuova prima di sapere se l'allenamento a tempo servirà ad altri esercizi.

## Rate limit in memoria

Login e registrazione accettano 5 tentativi per finestra (15 minuti e 1 ora) per indirizzo IP, in una `Map` di processo. Va bene per un server solo, in sviluppo. Gli inviti useranno lo stesso helper quando verranno implementati. Non è un limite distribuito.

## Pagine oltre login e home

Le route dei due ruoli esistono già, con il controllo nel middleware e di nuovo nel layout server. Le schermate che non sono di questa fase mostrano solo il titolo e una frase: non contengono dati finti né azioni.

## Tema

Chiaro e scuro seguono il sistema finché l'utente non sceglie. La scelta resta in `localStorage`.

## Integrazioni mock o reali

La scelta sta in `NEXT_PUBLIC_INTEGRATIONS` (`mock` oppure `real`). È pubblica perché camera, voce e diretta girano nel browser. Il valore di default è `mock`. Il punto di scambio è `createIntegrations` in `src/lib/integrations/index.ts`: con `real` oggi lancia `IntegrationError` `NOT_IMPLEMENTED`, finché il servizio vero non sostituisce `createRealIntegrations`.

Lo stesso errore non critico viene detto al massimo 3 volte per serie (`voiceDedupeLimit`). Oltre, la voce lo mette da parte. `CRITICAL` non entra nel conteggio. `pause()` interrompe il sottotitolo in corso e non accoda le frasi arrivate mentre il coach parla.

Il budget per la voce reale è 500 ms da `speak()` all'audio udibile, e 100 ms da frame che fa scattare la regola a `onError`. Sono tetti di contratto, non misure già verificate sul servizio vero.

Il pannello `/dev/integrations` esiste solo se il middleware riceve `allowDevRoutes`. Con `NODE_ENV=production` ogni path `/dev` e `/dev/*` risponde 404, per ogni ruolo, prima di qualunque redirect.

## Allenamento

Il flusso è un reducer puro in `src/lib/training/flow.ts`. Camera, voce, rete e IndexedDB stanno nel componente e non rientrano nelle transizioni.

Un errore salvato ha `ignored: true` quando non è `CRITICAL` e, nella stessa serie, o la voce lo ha messo da parte (`DEDUPED`) oppure lo stesso codice era già stato detto e si ripresenta entro le 3 ripetizioni successive (`ignoredWindowReps`). L'occorrenza detta a voce ha `ignored: false`. Se la voce non ha parlato, perché la modalità è `OFF` o `CRITICAL_ONLY` oppure è in pausa, quella occorrenza non apre la finestra e non conta come ignorata. Il riepilogo e `SetResult.errors` usano questa stessa regola. Il tetto di 3 detti della voce resta quello del contratto (`voiceDedupeLimit`): sono due conti diversi, tenuti uguali di proposito.

Il consenso camera è la versione `2026-11-13`. Senza `consentAt` il flusso non chiama `getUserMedia`. All'accettazione salva `consentAt` e `consentVersion`.

La sessione nasce quando la camera è concessa e l'atleta preme Inizia. Uscire durante il conto alla rovescia, la serie o il recupero porta la `WorkoutSession` ad `ABANDONED`. L'ultima serie la porta a `COMPLETED`. Se il salvataggio non riesce, la richiesta resta in IndexedDB (`fit-ai` / `outbox`) e riparte al ritorno della rete. Un nuovo invio della stessa serie, a sessione già conclusa, non crea un secondo `SetResult`.

Durante la serie si chiede uno Screen Wake Lock. Se il browser non lo supporta o lo rifiuta, l'allenamento continua senza avviso.

Il recupero mostra i secondi consigliati, ma il comando Continua è subito disponibile. Interrompi, in quella schermata, è un'altra azione e abbandona la sessione.

In modalità `assigned` il flusso chiede il token, entra nella stanza, pubblica la camera e ascolta voce remota e caduta di connessione tramite `getIntegrations()`. Non c'è ancora una schermata per il coach. In modalità `free` la stanza non viene aperta. Il catalogo pubblico resta usabile anche per chi ha già un coach.

Per il plank del seed le ripetizioni sono secondi di tenuta, quindi il contatore usa l'etichetta «secondi». Gli esercizi `NONE` non avviano l'analisi: restano camera, timer e conteggio manuale, con la scritta che l'esercizio non è analizzato.

## Inviti e lobby

Il token dell'invito è di 32 byte casuali in base64url. Nel database resta solo lo sha256. Il valore in chiaro torna una volta, nella risposta di creazione, e non viene più riletto. Le scadenze offerte sono 1, 7 o 30 giorni. Un invito `PENDING` con `expiresAt` passato viene mostrato e, alla lettura dell'elenco, segnato `EXPIRED`.

L'accettazione è una transazione. Il passaggio a `ACCEPTED` è un `updateMany` con `status = PENDING` e scadenza ancora futura: se due richieste arrivano insieme, una sola ottiene `count = 1`. Senza quella condizione l'invito non cambia e la membership non nasce.

Se l'atleta ha già un altro coach, l'accettazione senza conferma esplicita annulla la transazione e l'invito resta `PENDING`. Con la conferma, le `WorkoutSession` restano dell'atleta. Le schede attive di quel coach (`WorkoutAssignment` il cui workout appartiene al profilo coach) diventano inattive e la `Membership` viene cancellata. Il coach precedente non vede più l'atleta: la scheda cliente risponde 404, come per un id inesistente. `notFound()` in Next 15.5.29 disegna quella pagina ma lascia lo status a 200, anche in produzione. Il 404 vero lo mette il middleware, dopo un controllo server che non restituisce dati. Il coach attuale, finché la membership esiste, vede le sessioni dell'atleta, anche quelle fatte prima. Non c'è un endpoint che elenchi i membri a un atleta: la lettura della lobby è consentita solo al coach, e il controllo è sulla sessione, non sulla pagina.

`lastSeenAt` si aggiorna con un heartbeat ogni 20 secondi durante il conto alla rovescia, la serie e il recupero. Il recupero può durare più di 60 secondi e non deve sembrare un abbandono. Una sessione `IN_PROGRESS` senza heartbeat da oltre 60 secondi non è attiva. Non c'è un job separato: lobby, scheda cliente e un heartbeat tardivo la portano ad `ABANDONED`. Una sessione `COMPLETED` o `ABANDONED` non risulta mai «in allenamento», anche con `lastSeenAt` recente. «In diretta» è più stretto: sessione assegnata, heartbeat fresco e `privateLive` spento. L'allenamento libero è solo «in allenamento».

L'avviso al coach è un SSE su `GET /api/lobby/events`, aperto solo per il `userId` del coach. Il bus è in memoria e funziona solo nel processo Node che ha ricevuto sia l'evento sia la richiesta SSE. Su un hosting serverless (Vercel, per esempio) le due richieste finiscono spesso in processi diversi e l'avviso non arriva. La demo universitaria resta su un processo solo. In più la lobby rilegge `GET /api/lobby/clients` ogni 30 secondi: è la rete di sicurezza se l'evento si perde. Alla riconnessione il client fa la stessa lettura e non ricostruisce lo stato dagli eventi persi. Il badge «in diretta» viene dalla lettura. Il riquadro «cliente in diretta» arriva dall'evento e si azzera alla riconnessione. Il suono è spento finché il coach non lo attiva. Il pannello di debug pubblica lo stesso evento con `POST /api/dev/lobby-notice`, perché il mock del browser non è condiviso con la lobby. `/api/dev` risponde 404 in produzione, come `/dev`.

Lo Screen Wake Lock è chiesto durante la serie, ma non impedisce al sistema di spegnere lo schermo se l'atleta lo blocca. In quel caso i timer del browser rallentano, spesso oltre il minuto, e un heartbeat da 20 secondi con finestra di 60 può mancare. La sessione passa allora ad `ABANDONED` anche se l'atleta è ancora nella serie. Non allargo la finestra: 60 secondi resta il segnale che il client non risponde. La demo va fatta a schermo acceso.

Il canale dati della diretta è `publishData` e `onData`, descritto in `docs/INTEGRATIONS.md`. Il payload è validato con Zod: `repCount`, `formScore`, un errore di movimento con codice e gravità, e la fase `set` o `recovery`. Il mock del coach emette una serie da 8 ripetizioni con gli stessi codici dei video di prova (ginocchia in dentro, profondità, schiena curva), poi il recupero. Le due pagine non condividono il mock: i numeri che vede il coach li genera la sua stanza, nello stesso formato che l'atleta pubblica.

Ogni `POST /api/live/token` ricontrolla, sul server, che l'utente sia il coach della lobby, che `privateLive` sia spento, che la sessione sia assegnata e che l'heartbeat abbia meno di 60 secondi. Il token dura 90 secondi. Il client ne chiede uno nuovo circa 25 secondi prima della scadenza e chiama `refreshToken`: la stanza resta aperta, audio e video non cadono. Il coach pubblica solo audio, l'atleta audio e video. La stessa richiesta registra che il coach sta guardando: l'atleta la legge e vede «Martina ti sta guardando», con il pulsante per attivare subito la privacy. Non c'è un ingresso che salti questa registrazione. La registrazione è in memoria e dura 12 secondi. La pagina del coach la rinnova ogni 4 secondi con `POST /api/live/heartbeat`, che rifà gli stessi controlli. Se il coach chiude la scheda, l'ultimo segnale non arriva e l'avviso sparisce entro quei 12 secondi; se il browser riesce a mandare l'uscita in chiusura, sparisce subito. La griglia rinnova il controllo ogni 30 secondi e tiene una sola connessione finché l'elenco dei clienti non cambia.

Nella griglia il microfono del coach resta spento. Nella diretta singola il pulsante «Parla con il cliente» si accende e si spegne con un tocco o con la barra spaziatrice; con il mouse si può anche tenere premuto. Mentre il microfono è acceso la voce dell'analisi va in pausa. Uscire da quella schermata chiude solo la connessione del coach, non l'allenamento. La privacy attiva disconnette il coach con il motivo `PRIVACY_ENABLED` e il token successivo viene rifiutato. Al massimo 6 tile per pagina; le miniature stanno a qualità bassa e solo la tile in primo piano va a qualità alta. L'audio dei clienti parte spento e se ne sente uno solo.

Il consenso camera vale solo se `consentAt` è presente e `consentVersion` è uguale a `CONSENT_VERSION`. Una versione diversa fa ricomparire la richiesta. La versione corrente resta `2026-11-13`.

## Libreria, video e schede

I file video stanno in `data/videos`, fuori da `public/`. L'app chiede gli URL a `StorageProvider`. L'implementazione locale firma upload e lettura con HMAC e una scadenza: la lettura dura 10 minuti, l'upload 15. Un provider S3 si sostituisce in `getStorage` e restituisce gli URL del bucket; il resto del codice non costruisce percorsi. Le route `/api/storage` sono solo il trasporto locale, escluse dal middleware così un file da 100 MB non viene tagliato, e rispondono `206` con `Accept-Ranges` per Safari iOS.

Il server controlla peso e tipo sui primi byte (`ftyp` per MP4, intestazione EBML per WebM), non sull'estensione. La durata, al massimo 3 minuti, la legge il browser prima dell'upload: se non riesce a leggerla, il messaggio chiede un MP4 H.264. Il server non ha un decodificatore. Un upload non collegato a un esercizio dopo un'ora viene cancellato insieme al file. I video `placeholder:` del seed restano finti: il player mostra «Video non disponibile» e l'allenamento continua.

`GET /api/videos/[id]/url` risponde solo se l'esercizio è `PUBLIC`, se l'utente è il coach proprietario, o se è un atleta nella lobby di quel coach. Gli altri casi, compreso un video segnaposto, sono 404.

Un esercizio creato dal coach ha `analysisType` fisso su `NONE`. Il catalogo di sistema (`coachId` nullo) è in sola lettura. `PUBLIC` richiede la conferma esplicita. Archiviare mette `archivedAt` e non cancella la riga, anche se l'esercizio è già in una scheda o ha risultati. Non si aggiunge un esercizio archiviato a una scheda nuova. Se è già nella scheda attiva, l'atleta può ancora eseguirlo.

Togliere un esercizio da una scheda che ha già un `SetResult` non cancella la riga: scrive `removedAt` e sposta `position` sotto zero, così l'indice unico `(workoutId, position)` resta valido e lo storico tiene il collegamento. La stessa cosa succede se una sessione di quella scheda è `IN_PROGRESS`, anche senza risultati, perché il salvataggio della serie cerca ancora quella riga. Senza risultati e senza sessione aperta, la riga si cancella. Una sessione già aperta non rilegge la scheda: usa serie, ripetizioni, tempo e recupero ricevuti all'apertura della pagina. La lista in `/workout` si aggiorna da sola ogni 10 secondi, così la nuova assegnazione compare senza ricaricare l'applicazione.

Un atleta ha una sola scheda attiva. Assegnarne un'altra chiede conferma e mostra il titolo di quella che si chiude. Il coach può chiudere un'assegnazione senza sostituirla. L'assegnazione è rifiutata se l'atleta non è nella lobby di quel coach.

