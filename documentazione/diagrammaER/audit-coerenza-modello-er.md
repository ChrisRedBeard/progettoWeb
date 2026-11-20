# Audit di coerenza del modello E-R — FIT AI

Controllo puntuale di Draw.io, dizionario dei dati, motivazioni, goal e CRUDS. ✓ = coerente; ✗ = da rinforzare (manca un vincolo, una decisione o copertura CRUDS).

**File confrontati**

- `schemaERWeb.drawio.xml`
- `dizionario-dei-dati.md`
- `schema-er-motivazioni.md`
- `../goals/stakeholder-e-goal.md`
- `../goals/contesto-obiettivi.md`

## Esito

Il diagramma e il dizionario coincidono su nomi, attributi e cardinalità. Il modello è formalmente sincronizzato e copre le decisioni principali (AI opzionale, diretta opzionale, privacy, servizio coach, lobby multiple, inviti, chiusura assegnazione, autore della scheda, cancellazione logica dell’esercizio).

Restano **10 regole o decisioni da formalizzare** per impedire dati contraddittori e completare la tracciabilità CRUDS. Non lo dichiarerei ancora “perfetto” finché queste voci non vengono decise e, dove confermate, trasformate in vincoli esterni o subgoal CRUDS.

### Copertura

| Ambito | Controllati | Coerenti | Da rinforzare |
|---|---:|---:|---:|
| Entità | 21/21 | 9 | 12 |
| Relazioni | 35/35 | 12 | 23 |
| Generalizzazioni | 2/2 | 2 | 0 |
| Vincoli V1–V19 | 19/19 | 10 | 9 |
| **Totale** | **77/77** | **33** | **44** |

---

## 1. Cosa manca (priorità per il collega)

Non sono errori XML: sono condizioni di integrità che il modello attuale non impedisce, oppure operazioni non tracciate esplicitamente.

1. ✗ **Diretta AI-only** — definire in quale Conversazione viene svolta se l’atleta non appartiene a una lobby e non ha una chat.
2. ✗ **Autorizzazione AI** — abbonamento e monitoraggio devono appartenere allo stesso atleta della sessione e avere intervalli temporali compatibili.
3. ✗ **Servizio coach** — l’atleta deve essere membro attivo della lobby e il coach erogatore deve esserne il creatore.
4. ✗ **Pagamento** — atleta pagatore e coach beneficiario devono coincidere con le parti del Servizio coach riferito.
5. ✗ **Assegnazione** — V6 deve riferirsi allo stesso coach; decidere se una scheda può essere riassegnata conservando più cicli.
6. ✗ **Membership** — chiarire `data_ingresso` opzionale e se occorre conservare più cicli ingresso–uscita nella stessa lobby.
7. ✗ **Scheda** — `origine='coach'` deve corrispondere a Redige; `generata_AI` deve usare l’abbonamento del proprio atleta.
8. ✗ **Output AI** — Valuta, punteggio, tracking ed Errori devono derivare dal monitoraggio della stessa sessione.
9. ✗ **Conversazioni** — chiarire V4 nelle lobby e rendere verificabile l’appartenenza richiesta da V5.
10. ✗ **CRUDS** — aggiungere oggetto dati e operazioni per chat, messaggi, tagging e lifecycle dei modelli, oppure dichiararli fuori ambito.
11. ✗ **Unicità temporale** — decidere se ammettere più Abbonamenti AI/coach attivi contemporaneamente per lo stesso proprietario.

---

## 2. Entità (21/21)

| ✓/✗ | Entità | Struttura verificata | Esito | Motivazione |
|---|---|---|---|---|
| ✓ | Utente | id_utente; nome; cognome; email; foto (0,1); genere | Coerente | Chiave e attributi comuni corretti; padre totale di Atleta e Coach. |
| ✓ | Atleta | altezza; peso; obiettivo + attributi ereditati | Coerente | Profilo e operazioni CRUDS dell’atleta coperti. |
| ✓ | Coach | link_social (0,N); livello_esperienza; tariffa + ereditati | Coerente | Confermato link social generale e multivalore 0,N. |
| ✓ | Certificazione | id_certificazione; titolo; ente_rilascio; data_conseguimento | Coerente | Entità autonoma correttamente posseduta dal coach. |
| ✗ | Abbonamento AI | id_abbonamento; data_inizio; data_fine; importo; stato | Da rinforzare | Storico corretto; manca il vincolo di unicità di un abbonamento attivo per atleta. |
| ✗ | Abbonamento coach | id_abbonamento; data_inizio; data_fine; importo; stato | Da rinforzare | Storico corretto; manca il vincolo di unicità di un abbonamento attivo per coach. |
| ✓ | Invito | id_invito; data_invio; stato; data_risposta (0,1) | Coerente | Mittente coach, atleta e lobby destinatari sono modellati da relazioni obbligatorie. |
| ✗ | Conversazione | id_conversazione; data_creazione | Da rinforzare | Padre corretto; non è definita la conversazione della diretta privata AI per un atleta senza lobby o chat. |
| ✗ | Chat privata | stato; data_chiusura (0,1) + ereditati | Da rinforzare | Struttura corretta, ma apertura/uso/chiusura della chat non è esplicitato nel raffinamento CRUDS. |
| ✓ | Lobby | nome; descrizione; max_partecipanti + ereditati | Coerente | Il coach può crearne 0,N come categorie di clienti. |
| ✗ | Messaggio | id_messaggio; testo; data_ora | Da rinforzare | Autore e conversazione sono corretti, ma messaggistica e tagging non compaiono nei subgoal CRUDS. |
| ✗ | Videochiamata | id_chiamata; inizio; fine (0,1); modalita_privata boolean | Da rinforzare | Privacy e chiusura corrette; la diretta AI-only richiede comunque una Conversazione, che potrebbe non esistere. |
| ✗ | Pagamento commissione | id_pagamento; data; importo; quota_piattaforma; periodo | Da rinforzare | Completo, ma va imposto che pagatore e beneficiario coincidano con le parti del Servizio coach. |
| ✗ | Servizio coach | id_servizio; data_inizio; data_fine (0,1); stato; tariffa_concordata | Da rinforzare | Completo; servono vincoli di coerenza tra atleta, coach, lobby e appartenenza attiva. |
| ✓ | Sessione allenamento | id_sessione; inizio; fine (0,1) | Coerente | Consente sessioni libere e opzioni indipendenti per diretta e AI. |
| ✗ | Monitoraggio AI | id_monitoraggio; inizio; fine (0,1); stato | Da rinforzare | Opzionale e autorizzato; manca il vincolo che l’abbonamento appartenga all’atleta della sessione e sia attivo nell’intervallo. |
| ✗ | Scheda | id_scheda; nome; data_creazione; origine; stato | Da rinforzare | Completa; occorre chiarire ri-assegnazione e coerenza tra origine='coach' e Redige. |
| ✓ | Esercizio | id_esercizio; nome; descrizione; gruppo_muscolare; stato | Coerente | La cancellazione logica è rappresentata da stato attivo/archiviato. |
| ✓ | Esecuzione esercizio | id_esecuzione; numero_serie; ripetizioni; carico; punteggio (0,1); tracking (0,1) | Coerente | Dati AI opzionali e separazione corretta tra esecuzione e prescrizione. |
| ✗ | Errore | id_errore; tipo; ripetizione; istante | Da rinforzare | Struttura corretta; manca il vincolo esplicito che un errore rilevato richieda monitoraggio AI. |
| ✗ | Modello AI | versione; data_addestramento; accuratezza | Da rinforzare | Struttura tecnica valida; ciclo di vita, pubblicazione e dismissione non sono documentati nei CRUDS. |

---

## 3. Relazioni (35/35)

| ✓/✗ | Relazione | Struttura verificata | Esito | Motivazione |
|---|---|---|---|---|
| ✗ | Scrive | Utente (0,N) — Messaggio (1,1) | Da rinforzare | Cardinalità corretta; messaggistica assente dai subgoal CRUDS. |
| ✗ | Partecipa | Utente (0,N) — Videochiamata (1,N) | Da rinforzare | Ogni chiamata ha almeno chi la avvia; l’ammissibilità è demandata interamente ai vincoli V5/V18. |
| ✗ | Inviato in | Messaggio (1,1) — Conversazione (0,N) | Da rinforzare | Cardinalità corretta; operazioni sui messaggi non esplicitate nei CRUDS. |
| ✗ | Svolta in | Videochiamata (1,1) — Conversazione (0,N) | Da rinforzare | Cardinalità corretta, ma manca la collocazione della diretta privata AI-only senza chat o lobby preesistente. |
| ✓ | Diretta di | Videochiamata (0,1) — Sessione (0,1) | Coerente | Diretta e sessione sono opzionali e al massimo uno-a-uno. |
| ✗ | Tagga | Messaggio (0,1) — Sessione (0,N) | Da rinforzare | V4 è ambiguo per una lobby con più atleti; tagging assente dai subgoal CRUDS. |
| ✗ | Genera | Invito (0,1) — Chat privata (1,1) | Da rinforzare | V1 è corretto; creazione e ciclo di vita della chat non sono esplicitati nei CRUDS. |
| ✓ | Destinato all’atleta | Atleta (0,N) — Invito (1,1) | Coerente | Ogni invito ha un solo atleta destinatario. |
| ✓ | Inviato da | Invito (1,1) — Coach (0,N) | Coerente | Il mittente è esclusivamente il coach. |
| ✓ | Destinato a | Invito (1,1) — Lobby (0,N) | Coerente | Ogni invito identifica precisamente la lobby. |
| ✓ | Crea | Coach (0,N) — Lobby (1,1) | Coerente | Ogni lobby ha un coach creatore; un coach può crearne molte. |
| ✗ | Membro di | Atleta (0,N) — Lobby (0,N); stato, ingresso (0,1), uscita (0,1) | Da rinforzare | V3 crea l’appartenenza all’accettazione: va chiarito perché data_ingresso resti opzionale. |
| ✗ | Acquista | Atleta (0,N) — Abbonamento AI (1,1) | Da rinforzare | Storico corretto; manca unicità temporale dell’abbonamento attivo. |
| ✗ | Effettua | Atleta (0,N) — Pagamento (1,1) | Da rinforzare | Serve uguaglianza col cliente del Servizio coach collegato. |
| ✗ | Riceve | Pagamento (1,1) — Coach (0,N) | Da rinforzare | Serve uguaglianza col coach erogatore del Servizio collegato. |
| ✗ | Acquista servizio | Atleta (0,N) — Servizio coach (1,1) | Da rinforzare | Serve appartenenza attiva dell’atleta alla lobby del servizio. |
| ✗ | Eroga | Coach (0,N) — Servizio coach (1,1) | Da rinforzare | Il coach deve coincidere col creatore della lobby del servizio. |
| ✗ | Collocato in | Servizio coach (1,1) — Lobby (0,N) | Da rinforzare | Struttura corretta; manca il vincolo trasversale coach/lobby/atleta. |
| ✗ | Riferito a | Pagamento (1,1) — Servizio coach (0,N) | Da rinforzare | V7 verifica attività e periodo, non l’uguaglianza delle parti. |
| ✗ | Sottoscrive | Coach (0,N) — Abbonamento coach (1,1) | Da rinforzare | Storico corretto; manca unicità temporale dell’abbonamento attivo. |
| ✓ | Possiede | Coach (0,N) — Certificazione (1,1) | Coerente | Ogni certificazione appartiene a un coach. |
| ✓ | Esegue | Atleta (0,N) — Sessione (1,1) | Coerente | Ogni sessione ha esattamente un atleta. |
| ✗ | Appartiene | Atleta (0,N) — Scheda (1,1) | Da rinforzare | Coerente se la scheda nasce già intestata; altrimenti confligge con creazione prima dell’assegnazione. |
| ✗ | Assegna | Coach (0,N) — Scheda (0,1); data, stato, fine (0,1) | Da rinforzare | La chiusura è modellata; max 1 non conserva più assegnazioni successive della stessa scheda. |
| ✗ | Redige | Coach (0,N) — Scheda (0,1) | Da rinforzare | Autore coach registrato; manca il vincolo di coerenza con Scheda.origine. |
| ✓ | Basata su | Sessione (0,1) — Scheda (0,N) | Coerente | Consente sessioni libere; V9 garantisce lo stesso atleta. |
| ✓ | Include | Sessione (0,N) — Esecuzione (1,1) | Coerente | Una sessione appena interrotta può non avere esecuzioni. |
| ✓ | Monitora | Sessione (0,1) — Monitoraggio AI (1,1) | Coerente | Monitoraggio opzionale e massimo uno per sessione. |
| ✗ | Autorizzato da | Abbonamento AI (0,N) — Monitoraggio (1,1) | Da rinforzare | V11 impone lo stato attivo, ma non lo stesso atleta della sessione né la sovrapposizione temporale. |
| ✓ | Comprende | Scheda (0,N) — Esercizio (0,N); serie, ripetizioni, carico, recupero, ordine | Coerente | Prescrizione correttamente collocata sulla relazione N:N. |
| ✓ | Relativa a | Esecuzione (1,1) — Esercizio (0,N) | Coerente | Ogni esecuzione riguarda un esercizio del catalogo. |
| ✗ | Rileva | Esecuzione (0,N) — Errore (1,1) | Da rinforzare | Cardinalità corretta; va legata esplicitamente al monitoraggio AI. |
| ✗ | Valuta | Esecuzione (0,1) — Modello AI (0,N) | Da rinforzare | Cardinalità corretta; V12 deve riferirsi al monitoraggio della stessa sessione dell’esecuzione. |
| ✗ | Addestra | Esecuzione (0,N) — Modello AI (0,N) | Da rinforzare | N:N valida; selezione, autorizzazione e lifecycle dei dati di addestramento non sono nei goal/CRUDS. |
| ✗ | Personalizza | Atleta (0,N) — Modello AI (0,1) | Da rinforzare | Distingue modello base e personalizzato, ma il lifecycle delle versioni personalizzate non è documentato. |

---

## 4. Generalizzazioni (2/2)

| ✓/✗ | Generalizzazione | Tipo | Esito | Motivazione |
|---|---|---|---|---|
| ✓ | Utente → Atleta, Coach | totale, sovrapposta (t,s) | Coerente | Ogni utente ha almeno un ruolo e può averli entrambi. |
| ✓ | Conversazione → Chat privata, Lobby | totale, esclusiva (t,e) | Coerente | Ogni conversazione è esattamente di un tipo. |

---

## 5. Vincoli esterni V1–V19 (19/19)

| ✓/✗ | Vincolo | Contenuto | Esito | Motivazione |
|---|---|---|---|---|
| ✓ | V1 | Chat privata solo da invito accettato | Coerente | Allinea Genera con lo stato dell’invito. |
| ✓ | V2 | Invito dal creatore della lobby verso un atleta | Coerente | Garantisce mittente coach e propria lobby. |
| ✓ | V3 | Accettazione invito attiva Membro di | Coerente | Collega invito e appartenenza. |
| ✗ | V4 | Tag solo a sessione dell’atleta della chat | Da rinforzare | “Atleta della chat” è ambiguo nelle lobby con più atleti. |
| ✗ | V5 | Autore/partecipante appartiene alla conversazione | Da rinforzare | L’appartenenza è derivata, non modellata direttamente. |
| ✗ | V6 | Assegnazione solo con servizio coach attivo | Da rinforzare | Deve specificare lo stesso atleta e lo stesso coach assegnante. |
| ✗ | V7 | Pagamento riferito a servizio attivo nel periodo | Da rinforzare | Manca l’uguaglianza tra le parti del pagamento e del servizio. |
| ✗ | V8 | Scheda generata AI richiede abbonamento AI | Da rinforzare | Deve essere l’abbonamento attivo dell’atleta proprietario, nel periodo corretto. |
| ✓ | V9 | Sessione e scheda dello stesso atleta | Coerente | Garantisce proprietà coerente. |
| ✓ | V10 | Membri attivi entro max_partecipanti | Coerente | Rispetta capienza lobby. |
| ✗ | V11 | Monitoraggio richiede abbonamento AI attivo | Da rinforzare | Deve appartenere all’atleta della sessione ed essere temporalmente valido. |
| ✗ | V12 | Valuta, punteggio e tracking solo con AI | Da rinforzare | Va riferito al monitoraggio della stessa sessione e deve includere Errore/Rileva. |
| ✓ | V13 | Massimo una diretta e un monitoraggio per sessione | Coerente | Ridondante ma coerente con le cardinalità. |
| ✗ | V14 | Diretta con AI o servizio coach attivo | Da rinforzare | L’abilitazione deve appartenere all’atleta della sessione e va definita la conversazione AI-only. |
| ✓ | V15 | Solo AI implica diretta privata | Coerente | Rispetta la scelta indipendente. |
| ✓ | V16 | Privacy blocca coach, non allenamento/AI | Coerente | Separa accesso video e monitoraggio. |
| ✓ | V17 | Chiusura sessione termina diretta e AI | Coerente | Copre il subgoal Chiudi sessione. |
| ✗ | V18 | Coach vede solo membri delle proprie lobby con servizio | Da rinforzare | Corretto come requisito, ma dipende dalla coerenza trasversale fra cinque relazioni. |
| ✓ | V19 | Indice ripetizione dell’errore entro il totale | Coerente | Garantisce validità dell’errore. |

---

## 6. Verdetto

Il modello è **formalmente sincronizzato** e copre le decisioni di business già concordate.

Non è ancora **perfetto** finché le voci della sezione 1 non vengono:

1. discusse e confermate;
2. trasformate in vincoli esterni aggiuntivi (dove serve);
3. oppure dichiarate fuori ambito nei goal/CRUDS (dove non servono).

Se si interviene, i punti più urgenti da chiudere insieme sono:

- diretta AI senza conversazione preesistente;
- coincidenza atleta/coach/lobby su servizio e pagamento;
- abbonamento AI dello stesso atleta della sessione;
- copertura CRUDS di chat/messaggi/modelli oppure esclusione esplicita.
