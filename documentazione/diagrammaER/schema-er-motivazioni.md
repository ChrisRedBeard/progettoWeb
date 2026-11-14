# Schema E-R – progettoWeb: motivazioni delle scelte

File del diagramma: `schema_er_progettoWeb.drawio` (notazione italiana: rettangoli = entità, rombi = associazioni, ● identificatore, ○ attributo).

## Come leggere le cardinalità (min,max)
La coppia sul ramo dice quante volte una singola istanza dell'entità partecipa all'associazione.
- min 0 → **subset**: partecipa solo un sottoinsieme delle istanze (partecipazione parziale)
- min 1 → **all**: partecipano tutte le istanze (partecipazione totale)
- max 1 → **1**: ogni istanza partecipa al massimo una volta; max N → più volte
- (1,1) = all + 1 · (0,1) = subset + 1 · (1,N) = all, molte · (0,N) = subset, molte

## Generalizzazioni
- **Utente → Atleta, Coach (t,s)**: totale, perché ogni utente è almeno atleta o coach; sovrapposta, perché un coach può essere anche atleta. Gli attributi comuni (nome, cognome, email, foto) stanno sul padre, così come Scrive e Partecipa (chattano entrambi i ruoli).
- **Conversazione → Chat privata, Lobby (t,e)**: entrambe contengono messaggi e videochiamate, quindi "Inviato in" e "Svolta in" si definiscono una sola volta sul padre; esclusiva perché una conversazione è o 1-a-1 o di gruppo.

## Associazioni
| Associazione | Cardinalità | Perché |
|---|---|---|
| Coinvolge atleta | Invito (1,1) – Atleta (0,N) | Invito "uno ad uno": esattamente un atleta per invito; un atleta può non averne o averne molti (più coach, storico) |
| Coinvolge coach | Invito (1,1) – Coach (0,N) | Esattamente un coach per invito; un coach ne invia/riceve molti o nessuno |
| Genera | Invito (0,1) – Chat privata (1,1) | Solo gli inviti accettati generano una chat; ogni chat nasce da un solo invito |
| Scrive | Utente (0,N) – Messaggio (1,1) | Un messaggio ha un solo autore; non tutti gli utenti scrivono |
| Inviato in | Messaggio (1,1) – Conversazione (0,N) | Un messaggio sta in una sola conversazione; una conversazione nuova è vuota |
| Svolta in | Videochiamata (1,1) – Conversazione (0,N) | Ogni chiamata avviene in una sola chat/lobby; non tutte ne hanno |
| Partecipa | Utente (0,N) – Videochiamata (1,N) | N:N; almeno chi avvia la chiamata; in lobby entra solo una parte dei membri |
| Tagga | Messaggio (0,1) – Sessione (0,N) | Pochi messaggi taggano, al massimo una sessione ciascuno; una sessione può essere citata più volte |
| Crea | Coach (0,N) – Lobby (1,1) | Ogni lobby ha un solo coach creatore |
| Membro di | Atleta (0,N) – Lobby (0,N) | N:N con stato e data_ingresso; il "tot" di atleti è max_partecipanti (vincolo esterno) |
| Acquista | Atleta (0,N) – Abbonamento AI (1,1) | Non tutti gli atleti usano l'AI; i rinnovi creano più abbonamenti nel tempo |
| Effettua | Atleta (0,N) – Pagamento commissione (1,1) | Ogni pagamento ha un solo pagatore |
| Riceve | Coach (0,N) – Pagamento commissione (1,1) | Ogni pagamento ha un solo coach beneficiario; quota_piattaforma = trattenuta |
| Sottoscrive | Coach (0,N) – Abbonamento coach (1,1) | Un coach appena registrato può non aver ancora pagato; una riga per periodo |
| Possiede | Coach (0,N) – Certificazione (1,1) | Attributo multivalore promosso a entità; un coach può non dichiararne |
| Appartiene | Atleta (0,N) – Scheda (1,1) | Ogni scheda è dell'atleta che la segue, anche se assegnata da un coach |
| Assegna | Coach (0,N) – Scheda (0,1) | Solo le schede assegnate da un coach partecipano |
| Comprende | Scheda (1,N) – Esercizio (0,N) | N:N; serie, ripetizioni, carico, recupero, ordine sono attributi del legame |
| Esegue | Atleta (0,N) – Sessione (1,1) | Ogni sessione è di un solo atleta |
| Basata su | Sessione (0,1) – Scheda (0,N) | Una sessione può essere libera |
| Include | Sessione (0,N) – Esecuzione esercizio (1,1) | Una sessione interrotta subito non ha esecuzioni |
| Relativa a | Esecuzione (1,1) – Esercizio (0,N) | Ogni esecuzione riguarda un esercizio del catalogo |
| Valuta | Esecuzione (1,1) – Modello AI (0,N) | Ogni esecuzione è giudicata da una versione precisa del modello |
| Addestra | Esecuzione (0,N) – Modello AI (0,N) | N:N: le esecuzioni diventano dati di addestramento; la prima versione può usare dati esterni |
| Personalizza | Atleta (0,N) – Modello AI (0,1) | Il modello base è generico; una versione personalizzata è di un solo atleta |

## Altre scelte
- **Invito è un'entità** e non un'associazione: un'istanza di associazione è identificata dalla coppia atleta-coach, quindi non si potrebbe registrare un secondo invito tra le stesse persone (rifiutato e rinviato, o atleta che torna).
- **Dati aggregati**: sono derivati dalle sessioni ed esecuzioni, si calcolano con query; nessuna entità.
- **AI generativa**: è un servizio, non un dato; resta traccia in Scheda.origine ∈ {manuale, consigli_AI, generata_AI, coach}.
- **Abbonamento AI / Abbonamento coach**: stessi attributi; si possono generalizzare in Abbonamento (t,e).

## Vincoli esterni
Vincoli di integrità non esprimibili nello schema
V1 · Una Chat privata esiste solo per un Invito con stato = 'accettato'.
V2 · Mittente e destinatario di un Invito devono essere utenti diversi.
V3 · Un Messaggio può taggare solo una Sessione dell'atleta della chat in cui è inviato (non nelle lobby).
V4 · Il mittente di un Messaggio / partecipante a una Videochiamata deve far parte della conversazione.
V5 · Un Coach assegna Schede solo ad atleti con cui ha una Chat privata attiva.
V6 · Pagamento: tra atleta e coach deve esistere un Invito accettato.
V7 · Una Scheda con origine = 'generata_AI' richiede un Abbonamento AI attivo alla data di creazione.
V8 · Se una Sessione è Basata su una Scheda, la Scheda appartiene allo stesso atleta.
V9 · Numero di membri di una Lobby ≤ max_partecipanti.
V10 · Errore.ripetizione compresa tra 1 e le ripetizioni dell’Esecuzione
