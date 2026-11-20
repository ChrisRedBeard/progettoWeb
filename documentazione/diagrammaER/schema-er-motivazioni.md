# Schema E-R – progettoWeb: motivazioni delle scelte

File del diagramma: `schemaERWeb.drawio.xml` (notazione italiana: rettangoli = entità, rombi = associazioni, ● identificatore, ○ attributo). Il dizionario dei termini, nel formato richiesto dalle slide, è `dizionario-dei-dati.md`.

## Come leggere le cardinalità (min,max)
La coppia sul ramo dice quante volte una singola istanza dell'entità partecipa all'associazione.
- min 0 → **subset**: partecipa solo un sottoinsieme delle istanze (partecipazione parziale)
- min 1 → **all**: partecipano tutte le istanze (partecipazione totale)
- max 1 → **1**: ogni istanza partecipa al massimo una volta; max N → più volte
- (1,1) = all + 1 · (0,1) = subset + 1 · (1,N) = all, molte · (0,N) = subset, molte

## Generalizzazioni
- **Utente → Atleta, Coach (t,s)**: totale, perché ogni utente è almeno atleta o coach; sovrapposta, perché un coach può essere anche atleta. Gli attributi comuni (nome, cognome, genere, email, foto) stanno sul padre, così come Scrive e Partecipa (chattano entrambi i ruoli).
- **Conversazione → Chat privata, Lobby (t,e)**: entrambe contengono messaggi e videochiamate, quindi "Inviato in" e "Svolta in" si definiscono una sola volta sul padre; esclusiva perché una conversazione è o 1-a-1 o di gruppo.

## Associazioni
| Associazione | Cardinalità | Perché |
|---|---|---|
| Destinato all’atleta | Invito (1,1) – Atleta (0,N) | Ogni invito ha un solo atleta destinatario; un atleta può riceverne molti nel tempo |
| Inviato da | Invito (1,1) – Coach (0,N) | Il mittente è sempre il coach; non serve un attributo libero `mittente` |
| Destinato a | Invito (1,1) – Lobby (0,N) | Ogni invito specifica la lobby; una lobby può ricevere molti inviti |
| Genera | Invito (0,1) – Chat privata (1,1) | Solo gli inviti accettati generano una chat; ogni chat nasce da un solo invito |
| Scrive | Utente (0,N) – Messaggio (1,1) | Un messaggio ha un solo autore; non tutti gli utenti scrivono |
| Inviato in | Messaggio (1,1) – Conversazione (0,N) | Un messaggio sta in una sola conversazione; una conversazione nuova è vuota |
| Svolta in | Videochiamata (1,1) – Conversazione (0,N) | Ogni chiamata avviene in una sola chat/lobby; non tutte ne hanno |
| Diretta di | Videochiamata (0,1) – Sessione (0,1) | Una chiamata può non essere una diretta di allenamento; sessione e diretta sono opzionali e al massimo una a una |
| Partecipa | Utente (0,N) – Videochiamata (1,N) | N:N; almeno chi avvia la chiamata; in lobby entra solo una parte dei membri |
| Tagga | Messaggio (0,1) – Sessione (0,N) | Pochi messaggi taggano, al massimo una sessione ciascuno; una sessione può essere citata più volte |
| Crea | Coach (0,N) – Lobby (1,1) | Ogni lobby ha un solo coach creatore |
| Membro di | Atleta (0,N) – Lobby (0,N) | N:N con stato, data_ingresso e data_uscita; un coach può creare più lobby come categorie |
| Acquista | Atleta (0,N) – Abbonamento AI (1,1) | Non tutti gli atleti usano l'AI; i rinnovi creano più abbonamenti nel tempo |
| Effettua | Atleta (0,N) – Pagamento commissione (1,1) | Ogni pagamento ha un solo pagatore |
| Riceve | Coach (0,N) – Pagamento commissione (1,1) | Ogni pagamento ha un solo coach beneficiario; quota_piattaforma = trattenuta |
| Acquista servizio | Atleta (0,N) – Servizio coach (1,1) | Ogni servizio appartiene a un atleta; lo storico conserva più rapporti |
| Eroga | Coach (0,N) – Servizio coach (1,1) | Ogni servizio è erogato da un solo coach |
| Collocato in | Servizio coach (1,1) – Lobby (0,N) | Il rapporto viene gestito in una precisa lobby del coach |
| Riferito a | Pagamento commissione (1,1) – Servizio coach (0,N) | Ogni pagamento è attribuito a un rapporto; un rapporto può avere più pagamenti periodici |
| Sottoscrive | Coach (0,N) – Abbonamento coach (1,1) | Un coach appena registrato può non aver ancora pagato; una riga per periodo |
| Possiede | Coach (0,N) – Certificazione (1,1) | Attributo multivalore promosso a entità; un coach può non dichiararne |
| Appartiene | Atleta (0,N) – Scheda (1,1) | Ogni scheda è dell'atleta che la segue, anche se assegnata da un coach |
| Redige | Coach (0,N) – Scheda (0,1) | Registra l’autore coach anche prima dell’assegnazione; le schede non redatte da coach non partecipano |
| Assegna | Coach (0,N) – Scheda (0,1) | Stato, data_assegnazione e data_fine permettono la chiusura senza perdere lo storico |
| Comprende | Scheda (0,N) – Esercizio (0,N) | N:N; una scheda appena creata può essere vuota. Serie, ripetizioni, carico, recupero e ordine sono attributi del legame |
| Rileva | Esecuzione (0,N) – Errore (1,1) | Un’esecuzione può non avere errori. Ogni errore appartiene a una sola esecuzione: tipo, ripetizione e istante sono attributi dell’errore, numero_serie è attributo dell’esecuzione |
| Esegue | Atleta (0,N) – Sessione (1,1) | Ogni sessione è di un solo atleta |
| Basata su | Sessione (0,1) – Scheda (0,N) | Una sessione può essere libera |
| Include | Sessione (0,N) – Esecuzione esercizio (1,1) | Una sessione interrotta subito non ha esecuzioni |
| Monitora | Sessione (0,1) – Monitoraggio AI (1,1) | Il monitoraggio è opzionale e una sessione ne ha al massimo uno |
| Autorizzato da | Abbonamento AI (0,N) – Monitoraggio AI (1,1) | Ogni monitoraggio è autorizzato da un abbonamento AI attivo |
| Relativa a | Esecuzione (1,1) – Esercizio (0,N) | Ogni esecuzione riguarda un esercizio del catalogo |
| Valuta | Esecuzione (0,1) – Modello AI (0,N) | Solo le esecuzioni monitorate dall’AI sono giudicate da una versione del modello |
| Addestra | Esecuzione (0,N) – Modello AI (0,N) | N:N: le esecuzioni diventano dati di addestramento; la prima versione può usare dati esterni |
| Personalizza | Atleta (0,N) – Modello AI (0,1) | Il modello base è generico; una versione personalizzata è di un solo atleta |

## Altre scelte
- **Invito è un'entità** e non un'associazione: un'istanza di associazione è identificata dalla coppia atleta-coach, quindi non si potrebbe registrare un secondo invito tra le stesse persone (rifiutato e rinviato, o atleta che torna).
- **Dati aggregati**: sono derivati dalle sessioni ed esecuzioni, si calcolano con query; nessuna entità.
- **AI generativa**: è un servizio, non un dato; resta traccia in Scheda.origine ∈ {manuale, consigli_AI, generata_AI, coach}.
- **Abbonamento AI / Abbonamento coach**: stessi attributi; si possono generalizzare in Abbonamento (t,e).
- **Servizio coach è distinto dall’Abbonamento coach**: il primo è il rapporto acquistato dall’atleta; il secondo abilita il coach all’uso degli strumenti di FIT AI.
- **Monitoraggio AI e diretta sono indipendenti**: l’atleta può attivarli entrambi, uno solo o nessuno. Se attiva soltanto l’AI, la diretta nasce privata.
- **Cancellazione logica dell’esercizio**: Esercizio.stato ∈ {attivo, archiviato} conserva i riferimenti storici.

## Vincoli esterni
Vincoli di integrità non esprimibili nello schema
V1 · Una Chat privata esiste solo per un Invito con stato = 'accettato'.
V2 · Un Invito è inviato dal Coach creatore della Lobby ed è destinato a un Atleta.
V3 · Accettare un Invito attiva Membro di per l’Atleta e la Lobby destinataria.
V4 · Un Messaggio può taggare solo una Sessione dell’atleta della chat.
V5 · Il mittente di un Messaggio o partecipante a una Videochiamata appartiene alla Conversazione.
V6 · Un Coach assegna Schede solo ad Atleti con Servizio coach attivo.
V7 · Ogni Pagamento commissione si riferisce a un Servizio coach attivo nel periodo pagato.
V8 · Una Scheda con origine = 'generata_AI' richiede un Abbonamento AI attivo.
V9 · Se una Sessione è Basata su una Scheda, la Scheda appartiene allo stesso Atleta.
V10 · Il numero di membri attivi di una Lobby non supera max_partecipanti.
V11 · Un Monitoraggio AI richiede un Abbonamento AI attivo.
V12 · Valuta, punteggio e tracking esistono solo con Monitoraggio AI attivo.
V13 · Una Sessione può avere al massimo una Diretta e un Monitoraggio AI.
V14 · La Diretta può partire con Abbonamento AI attivo o Servizio coach attivo.
V15 · Se parte solo il Monitoraggio AI, la Diretta nasce privata.
V16 · La modalità privata blocca il Coach, non Sessione e Monitoraggio AI.
V17 · La chiusura della Sessione termina Diretta e Monitoraggio AI.
V18 · Il Coach vede diretta e statistiche solo per membri attivi di proprie Lobby con Servizio attivo.
V19 · Errore.ripetizione è compresa tra 1 e le ripetizioni dell’Esecuzione.
