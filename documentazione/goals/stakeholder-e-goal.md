# Stakeholder e goal

Gli stakeholder sono le persone che usano FIT AI: l’atleta e il coach. Un goal è la richiesta, cioè il problema che quella persona porta. Un requisito è la risposta del sistema. Il sotto-goal è la stessa richiesta, ristretta a un caso che si può realizzare con operazioni sui dati.

## Atleta

**Goal A — Eseguire il gesto in modo corretto anche se in sala non c’è un istruttore.**

Il problema è non accorgersi dell’errore mentre lo si sta facendo.

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| A1. Essere corretto durante la serie | All’avvio, dopo il consenso alla camera, nasce una sessione. A ogni serie il sistema conta le ripetizioni, calcola il punteggio di forma e segnala l’errore (ginocchia in dentro, schiena curva, profondità insufficiente, tempo troppo veloce). La serie conclusa resta come esecuzione: ripetizioni, punteggio, errori, perdita di inquadratura. |
| A2. Sapere cosa fare oggi | Se l’atleta ha un coach, la home di allenamento mostra la scheda attiva, con ordine, serie, ripetizioni, tempo e recupero. Il catalogo pubblico resta consultabile anche per chi ha già un coach. |
| A3. Ritrovare il lavoro già fatto | Lo storico elenca le sessioni dell’atleta e, per ciascuna, le esecuzioni salvate. |

**Goal B — Farsi seguire da un coach senza perdere il controllo su chi guarda.**

Il problema è entrare nel gruppo giusto e poter chiudere la ripresa quando non si vuole essere osservati.

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| B1. Entrare nella lobby del coach scelto | L’atleta accetta un invito ancora valido. L’accettazione crea l’appartenenza a quella lobby. Se ha già un altro coach, il sistema chiede conferma: solo allora chiude le schede attive del coach precedente e toglie la membership vecchia. Le sessioni già svolte restano sue. |
| B2. Impedire l’ingresso in diretta | L’atleta attiva la modalità privata sulla propria membership. Il coach collegato viene disconnesso e un ingresso successivo viene rifiutato. |

**Goal C — Pagare i servizi che usa e il coach che lo segue.**

Il problema è usare l’analisi e il lavoro del coach senza un acquisto riconducibile a chi li ha richiesti.

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| C1. Avere l’analisi a pagamento | L’atleta acquista un abbonamento AI. Ogni rinnovo è un nuovo periodo. Una scheda di origine generata dall’AI viene accettata solo se, in quella data, un abbonamento è attivo. |
| C2. Compensare il proprio coach | L’atleta registra un pagamento di commissione verso il coach con cui ha un invito accettato. La quota della piattaforma è la parte trattenuta; il resto è del coach. |

## Coach

**Goal D — Preparare il lavoro di molti atleti e sapere come lo stanno eseguendo.**

Il problema è non poter scrivere una scheda diversa per ogni ora di sala e non vedere il risultato quando l’atleta si allena da casa.

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| D1. Costruire un esercizio riusabile | Il coach crea l’esercizio con titolo, descrizione, serie e recupero di default, e vi collega al più un video di spiegazione e uno di esecuzione. Può aggiornarlo. Se non deve più comparire nelle schede nuove, lo archivia: la riga resta, perché schede e risultati già esistenti la citano. Il catalogo di sistema è in sola lettura. |
| D2. Consegnare una scheda a un atleta della lobby | Il coach compone la scheda, riordina gli esercizi e la assegna. Un atleta ha una sola scheda attiva: una nuova assegnazione chiede conferma e chiude la precedente. L’assegnazione è rifiutata se l’atleta non è in lobby. Togliere un esercizio che ha già risultati, o che appartiene a una sessione aperta, non cancella la riga: la marca come rimossa, così lo storico resta collegato. Senza risultati e senza sessione aperta, la riga si elimina. |
| D3. Leggere i risultati | Dalla scheda cliente il coach consulta le sessioni di quell’atleta, anche quelle iniziate prima dell’ingresso in lobby, finché la membership esiste. |

**Goal E — Intervenire mentre l’atleta si sta allenando, e solo se lui è d’accordo.**

Il problema è accorgersi in ritardo, o entrare in una ripresa che l’atleta ha voluto chiudere.

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| E1. Vedere chi è in allenamento | La lobby elenca gli atleti e distingue chi ha una sessione aperta. «In diretta» richiede una scheda assegnata, un segnale recente e la privacy spenta. L’allenamento libero resta «in allenamento». |
| E2. Guardare e parlare | Il coach entra nella stanza solo se è il coach di quella lobby, la privacy è spenta, la sessione è assegnata e il segnale è recente. Pubblica solo l’audio. Mentre il microfono è aperto, la voce dell’analisi in pausa lascia spazio alla sua. Uscire dalla schermata chiude il suo collegamento, non l’allenamento dell’atleta. |

**Goal F — Ammettere solo gli atleti voluti e tenere in regola il proprio profilo.**

| Sotto-goal | Requisito (risposta del sistema) |
|---|---|
| F1. Invitare e poter ritirare l’invito | Il coach crea un invito con scadenza. Può revocarlo: lo stato diventa revocato e il token non è più accettabile. Un invito scaduto resta in elenco con stato scaduto. |
| F2. Mantenere l’accesso agli strumenti | Il coach sottoscrive l’abbonamento coach, un periodo alla volta. |
| F3. Dichiarare una qualifica | Il coach registra le certificazioni che possiede. Sono dati del suo profilo, consultabili insieme alla biografia. |

## Matrice delle operazioni

C crea, R legge, U aggiorna, D elimina, S cerca in un elenco. La cancellazione logica tiene la riga e ne cambia lo stato. La cancellazione fisica toglie la riga. Dove il sotto-goal non elimina nulla, le due ultime colonne restano vuote.

| Stakeholder | Goal | Sotto-goal | C | R | U | D | S | Cancellazione logica | Cancellazione fisica |
|---|---|---|---|---|---|---|---|---|---|
| Atleta | A | A1. Registrare la serie | ● | ● | | | ● | | |
| Atleta | A | A2. Consultare la scheda attiva | | ● | | | ● | | |
| Atleta | A | A3. Rivedere lo storico | | ● | | | ● | | |
| Atleta | B | B1. Accettare l’invito | ● | ● | ● | ● | | Schede del coach precedente: `active` diventa falso | Membership precedente rimossa |
| Atleta | B | B2. Attivare la diretta privata | | ● | ● | | | | |
| Atleta | C | C1. Acquistare l’abbonamento AI | ● | ● | | | ● | | |
| Atleta | C | C2. Pagare la commissione | ● | ● | | | | | |
| Coach | D | D1. Gestire un esercizio | ● | ● | ● | ● | ● | `archivedAt`: la riga resta, esclusa dalle schede nuove | |
| Coach | D | D2. Comporre e assegnare la scheda | ● | ● | ● | ● | ● | Assegnazione chiusa (`active` falso). Esercizio tolto ma con risultati o sessione aperta: `removedAt` | Esercizio tolto dalla scheda senza risultati e senza sessione aperta |
| Coach | D | D3. Leggere i risultati dell’atleta | | ● | | | ● | | |
| Coach | E | E1. Consultare la lobby | | ● | | | ● | | |
| Coach | E | E2. Entrare in diretta e parlare | | ● | ● | | | | |
| Coach | F | F1. Creare o revocare un invito | ● | ● | | ● | ● | Stato revocato o scaduto: la riga resta | |
| Coach | F | F2. Sottoscrivere l’abbonamento coach | ● | ● | | | ● | | |
| Coach | F | F3. Registrare una certificazione | ● | ● | ● | | ● | | |
