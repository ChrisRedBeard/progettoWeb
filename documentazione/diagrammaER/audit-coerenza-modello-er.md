# Audit di coerenza del modello E-R — FIT AI

Controllo puntuale di Draw.io, dizionario dei dati, motivazioni, goal e CRUDS, rifatto il 20 novembre 2026 dopo le decisioni di prodotto dello stesso giorno. ✓ = coerente; ✗ = da rinforzare (manca un vincolo, una decisione o copertura CRUDS); ⊘ = fuori ambito CRUDS (struttura verificata, operazioni escluse dall’analisi).

**File confrontati**

- `schemaERWeb.drawio.xml`
- `dizionario-dei-dati.md`
- `schema-er-motivazioni.md`
- `../goals/stakeholder-e-goal.md`
- `../goals/contesto-obiettivi.md`

## Esito

Diagramma e dizionario coincidono su tutte le 21 entità e le 35 associazioni: nomi, attributi, identificatori, attributi opzionali, attributi delle associazioni e cardinalità. Le motivazioni riportano le stesse cardinalità e gli stessi vincoli V1–V23. L’unica differenza è di forma, in V8: nel diagramma «Una Scheda generata_AI», nelle motivazioni «Una Scheda con origine = 'generata_AI'», con lo stesso significato.

Ogni entità e associazione in ambito ha nella matrice CRUDS l’operazione che la crea; manca solo chi legge Partecipa (punto 4). Chat privata, Messaggio, Modello AI e le associazioni che li riguardano sono fuori ambito per decisione del 20 novembre 2026.

Restano **9 punti da formalizzare** (sezione 1). Nessuno è un errore del diagramma: sono vincoli o decisioni mancanti.

### Copertura

| Ambito | Controllati | Coerenti | Da rinforzare | Fuori ambito |
|---|---:|---:|---:|---:|
| Entità | 21/21 | 13 | 5 | 3 |
| Relazioni | 35/35 | 21 | 8 | 6 |
| Generalizzazioni | 2/2 | 2 | 0 | 0 |
| Vincoli V1–V23 | 23/23 | 17 | 4 | 2 |
| **Totale** | **81/81** | **53** | **17** | **11** |

---

## 1. Cosa manca (priorità per il collega)

Non sono errori del diagramma: sono condizioni che il modello non impedisce, oppure decisioni da prendere.

1. ✗ **Origine e Redige** — `origine = 'coach'` deve valere se e solo se la Scheda partecipa a Redige.
2. ✗ **Assegnazione (V6)** — V6 deve dire che il Coach che assegna ha un Servizio coach attivo con l’Atleta a cui la Scheda appartiene. I cicli di riassegnazione non servono più: una scheda caricata non si modifica e si assegna una volta.
3. ✗ **Output AI (V12)** — Valuta, punteggio, tracking ed Errori devono derivare dal Monitoraggio AI della stessa Sessione dell’Esecuzione; V12 non cita gli Errori (Rileva).
4. ✗ **Chi sta guardando la diretta** — l’ingresso del coach viene registrato (G6.1 del coach, Partecipa), ma nella matrice nessuno lo legge. Manca una R per l’atleta, per esempio «Vede chi sta guardando la diretta», come fa già il codice.
5. ✗ **Unicità temporale degli abbonamenti** — decidere se lo stesso atleta, o lo stesso coach, può avere più abbonamenti attivi negli stessi giorni.
6. ✗ **Dirette in lobby (V5)** — per una Videochiamata in una Lobby va precisato chi appartiene alla conversazione: il coach che l’ha creata (Crea) e i membri attivi (Membro di).
7. ✗ **Abilitazione della diretta (V14)** — l’Abbonamento AI o il Servizio coach devono essere dell’Atleta della Sessione, come già dice V11 per il monitoraggio.
8. ✗ **Cicli di appartenenza** — dopo V3 data_ingresso è sempre nota e può diventare obbligatoria. Se un atleta esce e rientra nella stessa lobby, Membro di conserva un solo ciclo: se serve lo storico completo, va promossa a entità.
9. ✗ **Account cancellato** — manca un vincolo che impedisca nuovi inviti, assegnazioni, servizi o pagamenti per un Utente con stato = cancellato.

Consiglio, non bloccante: indicare i valori di `stato` anche per Invito, Membro di, Servizio coach, Abbonamento AI, Abbonamento coach e Monitoraggio AI, come già fatto per Utente, Esercizio e Scheda. V1 usa già il valore 'accettato'.

**Chiusi con le decisioni del 20 novembre 2026**

- Diretta con sola AI: si svolge privata e senza conversazione (Svolta in (0,1), V21).
- Autorizzazione AI: V11 e V8 richiedono l’abbonamento dello stesso atleta.
- Servizio coach: V22 lega coach, lobby e appartenenza attiva.
- Pagamento: V7 richiede che atleta e coach siano quelli del servizio.
- CRUDS di chat, messaggi, tag e modelli AI: dichiarati fuori ambito.
- Riassegnazione della stessa scheda: non serve più, perché una scheda caricata non si modifica.
- Scheda del coach: nasce per un atleta preciso (G3.1), coerente con Appartiene (1,1).
- Stato della scheda e dell’assegnazione: chiudere l’assegnazione lascia la scheda all’atleta, mentre una scheda chiusa ha sempre l’assegnazione chiusa (V23).

---

## 2. Entità (21/21)

| ✓/✗ | Entità | Struttura verificata | Esito | Motivazione |
|---|---|---|---|---|
| ✗ | Utente | id_utente; nome; cognome; email; foto (0,1); genere; stato | Da rinforzare | Padre totale di Atleta e Coach; stato serve alla cancellazione logica dell’account (G1.6 dell’atleta, G1.4 del coach), ma manca il vincolo sugli utenti cancellati (punto 9). |
| ✓ | Atleta | altezza; peso; obiettivo; modalita_feedback; data_consenso (0,1); versione_consenso (0,1) + ereditati | Coerente | Profilo, consenso alla camera e modalità del feedback coperti da G1.1–G1.6. |
| ✓ | Coach | link_social (0,N); livello_esperienza; tariffa + ereditati | Coerente | Profilo gestito da G1; l’atleta lo legge con G5.2. |
| ✓ | Certificazione | id_certificazione; titolo; ente_rilascio; data_conseguimento | Coerente | CRUDS completo (G10.1–G10.4, eliminazione fisica); la legge anche l’atleta (G5.2) ed è nel contesto. |
| ✗ | Abbonamento AI | id_abbonamento; data_inizio; data_fine; importo; stato | Da rinforzare | Acquisto, annullamento e consultazione coperti (G7.1–G7.3); manca l’unicità temporale (punto 5). |
| ✗ | Abbonamento coach | id_abbonamento; data_inizio; data_fine; importo; stato | Da rinforzare | Sottoscrizione, lettura e disdetta coperte (G7.1–G7.3 del coach); manca l’unicità temporale (punto 5). |
| ✓ | Invito | id_invito; data_invio; stato; data_risposta (0,1) | Coerente | Creato e revocato dal coach; l’atleta lo legge, lo accetta o lo rifiuta (G5.1–G5.4). Mittente, atleta e lobby sono obbligatori. |
| ✓ | Conversazione | id_conversazione; data_creazione | Coerente | Padre di Lobby e Chat privata; la diretta privata con sola AI non ne ha bisogno (V21). |
| ⊘ | Chat privata | stato; data_chiusura (0,1) + ereditati | Fuori ambito | Struttura corretta; la chat è esclusa dall’analisi CRUDS. |
| ✓ | Lobby | nome; descrizione; max_partecipanti + ereditati | Coerente | Creata, consultata e modificata dal coach (G9.1–G9.4); max_partecipanti ora si imposta (V10). |
| ⊘ | Messaggio | id_messaggio; testo; data_ora | Fuori ambito | Struttura corretta; i messaggi sono esclusi dall’analisi CRUDS. |
| ✓ | Videochiamata | id_chiamata; inizio; fine (0,1); modalita_privata | Coerente | Avviata (G8.3), resa privata o visibile (G6.1), chiusa (G8.5); il coach entra solo alle condizioni di V18 e V20. |
| ✓ | Pagamento commissione | id_pagamento; data; importo; quota_piattaforma; periodo | Coerente | Creato dall’atleta (G7.5) e consultato da entrambi; V7 lega pagatore e beneficiario al servizio. |
| ✓ | Servizio coach | id_servizio; data_inizio; data_fine (0,1); stato; tariffa_concordata | Coerente | Attivato e interrotto dall’atleta (G7.4, G7.6), consultato da entrambi; V22 lega coach, lobby e appartenenza. |
| ✓ | Sessione allenamento | id_sessione; inizio; fine (0,1) | Coerente | Libera o su una scheda (G8.1), chiusa con G8.5, consultata da atleta e coach (G4.1). |
| ✓ | Monitoraggio AI | id_monitoraggio; inizio; fine (0,1); stato | Coerente | Avviato con G8.2 e chiuso con G8.5; V11 richiede l’abbonamento dello stesso atleta per tutta la durata. |
| ✗ | Scheda | id_scheda; nome; data_creazione; origine; stato; nota (0,1) | Da rinforzare | Non modificabile dopo il caricamento, con nota e data, e nasce per un atleta preciso. Il suo stato non dipende dall’assegnazione (V23); resta il legame tra origine e Redige (punto 1). |
| ✓ | Esercizio | id_esercizio; nome; descrizione; gruppo_muscolare; stato | Coerente | Cancellazione logica (G2.4); consultato da atleta e coach. |
| ✓ | Esecuzione esercizio | id_esecuzione; numero_serie; ripetizioni; carico; punteggio_correttezza (0,1); dati_tracking (0,1) | Coerente | Registrata con G8.1 e consultata con G4.1; i dati AI sono opzionali. |
| ✗ | Errore | id_errore; tipo; ripetizione; istante | Da rinforzare | Letto in G8.4 e G4.1; manca il vincolo che lo leghi al monitoraggio AI della stessa sessione (punto 3). |
| ⊘ | Modello AI | versione; data_addestramento; accuratezza | Fuori ambito | Struttura corretta; il ciclo di vita dei modelli è escluso dall’analisi CRUDS. |

---

## 3. Relazioni (35/35)

| ✓/✗ | Relazione | Struttura verificata | Esito | Motivazione |
|---|---|---|---|---|
| ⊘ | Scrive | Utente (0,N) — Messaggio (1,1) | Fuori ambito | Cardinalità corretta; messaggi esclusi dall’analisi CRUDS. |
| ✗ | Partecipa | Utente (0,N) — Videochiamata (1,N) | Da rinforzare | Creata dall’atleta (G8.3) e dal coach che entra (G6.1), ma nessuno la legge (punto 4); per le dirette in lobby V5 va precisato (punto 6). |
| ⊘ | Inviato in | Messaggio (1,1) — Conversazione (0,N) | Fuori ambito | Cardinalità corretta; messaggi esclusi. |
| ✓ | Svolta in | Videochiamata (0,1) — Conversazione (0,N) | Coerente | La diretta privata con sola AI non ha conversazione (V21). |
| ✓ | Diretta di | Videochiamata (0,1) — Sessione (0,1) | Coerente | Diretta e sessione sono opzionali e al massimo una a una (V13). |
| ⊘ | Tagga | Messaggio (0,1) — Sessione (0,N) | Fuori ambito | Tag delle sessioni esclusi dall’analisi CRUDS. |
| ⊘ | Genera | Invito (0,1) — Chat privata (1,1) | Fuori ambito | Chat esclusa; V1 resta valido. |
| ✓ | Destinato all’atleta | Atleta (0,N) — Invito (1,1) | Coerente | Ogni invito ha un solo atleta destinatario, che lo legge, lo accetta o lo rifiuta. |
| ✓ | Inviato da | Invito (1,1) — Coach (0,N) | Coerente | Il mittente è sempre il coach (V2). |
| ✓ | Destinato a | Invito (1,1) — Lobby (0,N) | Coerente | Ogni invito indica la lobby. |
| ✓ | Crea | Coach (0,N) — Lobby (1,1) | Coerente | Un coach crea più lobby come categorie di clienti (G9.1). |
| ✗ | Membro di | Atleta (0,N) — Lobby (0,N); stato, data_ingresso (0,1), data_uscita (0,1) | Da rinforzare | Più coach per atleta e uscita logica (G5.3, G5.6); restano data_ingresso opzionale e i cicli nella stessa lobby (punto 8). |
| ✗ | Acquista | Atleta (0,N) — Abbonamento AI (1,1) | Da rinforzare | Storico corretto; manca l’unicità temporale (punto 5). |
| ✓ | Effettua | Atleta (0,N) — Pagamento (1,1) | Coerente | V7: chi paga è l’atleta del servizio. |
| ✓ | Riceve | Pagamento (1,1) — Coach (0,N) | Coerente | V7: chi riceve è il coach del servizio. |
| ✓ | Acquista servizio | Atleta (0,N) — Servizio coach (1,1) | Coerente | V22: l’atleta è membro attivo della lobby del servizio. |
| ✓ | Eroga | Coach (0,N) — Servizio coach (1,1) | Coerente | V22: il coach è il creatore della lobby. |
| ✓ | Collocato in | Servizio coach (1,1) — Lobby (0,N) | Coerente | V22 lega coach, lobby e atleta. |
| ✓ | Riferito a | Pagamento (1,1) — Servizio coach (0,N) | Coerente | V7 verifica il servizio attivo nel periodo e le parti coincidenti. |
| ✗ | Sottoscrive | Coach (0,N) — Abbonamento coach (1,1) | Da rinforzare | Storico corretto; manca l’unicità temporale (punto 5). |
| ✓ | Possiede | Coach (0,N) — Certificazione (1,1) | Coerente | Ogni certificazione appartiene a un coach. |
| ✓ | Esegue | Atleta (0,N) — Sessione (1,1) | Coerente | Ogni sessione ha un solo atleta. |
| ✓ | Appartiene | Atleta (0,N) — Scheda (1,1) | Coerente | Ogni scheda nasce intestata a un atleta, anche quella del coach (G3.1). |
| ✗ | Assegna | Coach (0,N) — Scheda (0,1); data_assegnazione, stato, data_fine (0,1) | Da rinforzare | Una scheda si assegna una volta e, se l’assegnazione si chiude, resta all’atleta (V23); resta V6 (punto 2). |
| ✗ | Redige | Coach (0,N) — Scheda (0,1) | Da rinforzare | Autore coach registrato; manca il legame con origine = 'coach' (punto 1). |
| ✓ | Basata su | Sessione (0,1) — Scheda (0,N) | Coerente | Sessione libera o su una delle proprie schede; V9 richiede lo stesso atleta e una scheda aperta. |
| ✓ | Include | Sessione (0,N) — Esecuzione (1,1) | Coerente | Una sessione interrotta subito può non avere esecuzioni. |
| ✓ | Monitora | Sessione (0,1) — Monitoraggio AI (1,1) | Coerente | Monitoraggio opzionale, al massimo uno per sessione. |
| ✓ | Autorizzato da | Abbonamento AI (0,N) — Monitoraggio (1,1) | Coerente | V11: abbonamento dello stesso atleta, attivo per tutta la durata. |
| ✓ | Comprende | Scheda (1,N) — Esercizio (0,N); serie, ripetizioni, carico, recupero, ordine | Coerente | Una scheda si carica con almeno un esercizio e poi non si modifica. |
| ✓ | Relativa a | Esecuzione (1,1) — Esercizio (0,N) | Coerente | Ogni esecuzione riguarda un esercizio del catalogo. |
| ✗ | Rileva | Esecuzione (0,N) — Errore (1,1) | Da rinforzare | Cardinalità corretta; va legata al monitoraggio AI della stessa sessione (punto 3). |
| ✗ | Valuta | Esecuzione (0,1) — Modello AI (0,N) | Da rinforzare | Cardinalità corretta; V12 deve riferirsi al monitoraggio della stessa sessione (punto 3). |
| ⊘ | Addestra | Esecuzione (0,N) — Modello AI (0,N) | Fuori ambito | N:N corretta; il ciclo di vita dei modelli è escluso. |
| ⊘ | Personalizza | Atleta (0,N) — Modello AI (0,1) | Fuori ambito | Distingue modello base e personalizzato; il ciclo di vita è escluso. |

---

## 4. Generalizzazioni (2/2)

| ✓/✗ | Generalizzazione | Tipo | Esito | Motivazione |
|---|---|---|---|---|
| ✓ | Utente → Atleta, Coach | totale, sovrapposta (t,s) | Coerente | Ogni utente ha almeno un ruolo e può averli entrambi; stato, usato per la cancellazione, sta sul padre. |
| ✓ | Conversazione → Chat privata, Lobby | totale, esclusiva (t,e) | Coerente | Ogni conversazione è di un solo tipo; la Chat privata resta nello schema anche se è fuori ambito CRUDS. |

---

## 5. Vincoli esterni V1–V23 (23/23)

| ✓/✗ | Vincolo | Contenuto | Esito | Motivazione |
|---|---|---|---|---|
| ⊘ | V1 | Chat privata solo da invito accettato | Fuori ambito | Corretto; riguarda la chat, esclusa dall’analisi. |
| ✓ | V2 | Invito dal creatore della lobby verso un atleta | Coerente | Garantisce mittente coach e propria lobby. |
| ✓ | V3 | Accettazione invito attiva Membro di | Coerente | Coerente con G5.3 e con più coach per atleta. |
| ⊘ | V4 | Tag solo a sessione dell’atleta della chat | Fuori ambito | Riguarda i tag, esclusi dall’analisi. |
| ✗ | V5 | Autore/partecipante appartiene alla conversazione | Da rinforzare | La parte sui messaggi è fuori ambito; per le dirette in lobby va detto chi appartiene alla conversazione (punto 6). |
| ✗ | V6 | Assegnazione solo con servizio coach attivo | Da rinforzare | Deve dire che il servizio è tra quel coach e l’atleta della scheda (punto 2). |
| ✓ | V7 | Pagamento riferito a servizio attivo, con le stesse parti | Coerente | Ora lega anche pagatore e beneficiario al servizio. |
| ✓ | V8 | Scheda generata dall’AI con abbonamento dell’atleta | Coerente | Usa l’abbonamento del proprietario della scheda; nel diagramma la frase è più breve, con lo stesso significato. |
| ✓ | V9 | Sessione e scheda dello stesso atleta, scheda aperta | Coerente | Impedisce di allenarsi su una scheda chiusa o eliminata. |
| ✓ | V10 | Membri attivi entro max_partecipanti | Coerente | max_partecipanti si imposta con G9.4. |
| ✓ | V11 | Monitoraggio con abbonamento dello stesso atleta, per tutta la durata | Coerente | Chiude il vecchio punto sull’autorizzazione AI. |
| ✗ | V12 | Valuta, punteggio e tracking solo con AI | Da rinforzare | Va riferito al monitoraggio della stessa sessione e deve includere Errore e Rileva (punto 3). |
| ✓ | V13 | Al massimo una diretta e un monitoraggio per sessione | Coerente | Ridondante ma coerente con le cardinalità. |
| ✗ | V14 | Diretta con AI o servizio coach attivo | Da rinforzare | La conversazione della diretta con sola AI è risolta (V21); manca che l’abilitazione sia dell’atleta della sessione (punto 7). |
| ✓ | V15 | Solo AI implica diretta privata | Coerente | Coerente con V21. |
| ✓ | V16 | Privacy blocca il coach, non allenamento e AI | Coerente | La privacy vale per la singola diretta (G6.1). |
| ✓ | V17 | Chiusura sessione termina diretta e AI | Coerente | Copre G8.5. |
| ✓ | V18 | Coach vede solo membri attivi delle proprie lobby con servizio | Coerente | Con V7 e V22 la coerenza tra coach, lobby, servizio e atleta è garantita. |
| ✓ | V19 | Ripetizione dell’errore entro il totale | Coerente | Garantisce la validità dell’errore. |
| ✓ | V20 | Coach in diretta solo su scheda assegnata da lui, con assegnazione aperta | Coerente | Recepisce la regola del codice (G6.1 del coach) e la lega all’assegnazione ancora aperta. |
| ✓ | V21 | Videochiamata senza conversazione = diretta privata con sola AI | Coerente | Coerente con Svolta in (0,1), V15 e Partecipa: partecipa solo l’atleta. |
| ✓ | V22 | Servizio nella lobby del coach, atleta membro attivo | Coerente | Lega Acquista servizio, Eroga, Collocato in e Membro di. |
| ✓ | V23 | Scheda chiusa ⇒ assegnazione chiusa; assegnazione chiusa non chiude la scheda | Coerente | Toglie la contraddizione tra Scheda.stato e Assegna.stato. |

---

## 6. Verdetto

Il modello è **formalmente sincronizzato**: diagramma, dizionario e motivazioni coincidono, e la matrice CRUDS copre tutte le entità in ambito.

Non è ancora **perfetto** per i 9 punti della sezione 1. I più importanti riguardano la scheda (punti 1 e 2), perché toccano le regole decise il 20 novembre: il legame tra origine e autore, e V6. Gli altri sono vincoli da precisare o una lettura che manca nella matrice.
