# 2. Individuazione degli stakeholder e dei goal

## 2.1 Individuazione degli stakeholder

Gli stakeholder sono i tipi di utente dell’applicazione.

- **Atleta.** Si registra, consulta il catalogo pubblicato dall’admin, crea schede scegliendo esercizi del catalogo e impostando serie, ripetizioni e tempo, si allena, riceve la correzione del gesto e acquista l’abbonamento AI e il servizio del coach.
- **Coach.** Consulta il catalogo, crea esercizi privati visibili solo a lui, prepara schede scegliendo esercizi del catalogo o i propri e impostando serie, ripetizioni e tempo, organizza le lobby, segue gli atleti in diretta, legge i risultati e riceve le commissioni. Paga l’abbonamento coach.

## 2.2 Diagramma di contesto

Il diagramma mostra i goal funzionali di ogni stakeholder. Al centro si trovano i goal condivisi; ai lati quelli propri di un solo stakeholder. La numerazione G1–G10 è mantenuta nel raffinamento per collegare ogni goal ai suoi subgoal.

Sono condivisi anagrafica, catalogo esercizi, scheda, inviti, diretta e acquisti, oltre a statistiche e misurazioni. Il catalogo contiene solo esercizi pubblicati dall’admin del sito. Allenamento appartiene all’atleta; lobby e certificazioni appartengono al coach. Il coach, oltre al catalogo, gestisce esercizi privati usabili solo nelle sue schede. All’avvio dell’allenamento, l’atleta può scegliere indipendentemente monitoraggio AI e diretta: l’AI richiede un Abbonamento AI attivo, mentre l’accesso del coach richiede un Servizio coach attivo e una sessione su una scheda assegnata da lui, con l’assegnazione ancora aperta. Se seleziona soltanto l’AI, la diretta nasce privata, così l’atleta vede i consigli del tracking, e può essere resa visibile durante la sessione. Senza nessuna delle due abilitazioni vengono registrate soltanto le esecuzioni. La chiusura dell’allenamento termina monitoraggio e diretta eventualmente attivi. La camera è facoltativa ma fortemente consigliata per un tracking ottimale, e l’atleta può accenderla o spegnerla in ogni momento.

![Diagramma di contesto: atleta e coach con frecce verso i goal (G1–G10)](diagramma-contesto.svg)

### Raffinamento

Per ogni stakeholder la tabella riporta i goal, i relativi subgoal e le operazioni consentite secondo la notazione CRUDS. Il codice del subgoal, per esempio G3.2, mostra immediatamente il goal padre G3.

C crea, R legge una singola istanza, U aggiorna, D elimina e S (Search) ricerca o consulta un insieme di dati. Nella colonna D, `F` indica la cancellazione fisica, `L` quella logica e `F/L` entrambe.

Una scheda caricata non si modifica: per aggiornarla se ne carica una nuova, con la sua nota e la sua data, e la precedente si chiude. Un atleta può avere più schede aperte; quella attiva è la scheda che segue nella sessione in corso.

Chat, messaggi, tag delle sessioni e ciclo di vita dei modelli AI restano nel modello E-R ma sono fuori dall’ambito di questa analisi, per non distogliere dalle azioni principali.

**Atleta**

| Stakeholder | Goal | Subgoal | C | R | U | D | S |
|---|---|---|---|---|---|---|---|
| Atleta | **G1 · Gestione anagrafica** | G1.1 · Registra la propria anagrafica | ● | | | | |
| Atleta | **G1 · Gestione anagrafica** | G1.2 · Visualizza i propri dati anagrafici | | ● | | | |
| Atleta | **G1 · Gestione anagrafica** | G1.3 · Modifica genere, altezza, peso, obiettivo e foto | | | ● | | |
| Atleta | **G1 · Gestione anagrafica** | G1.4 · Dà o revoca il consenso all’uso della camera | | | ● | | |
| Atleta | **G1 · Gestione anagrafica** | G1.5 · Imposta la modalità del feedback vocale | | | ● | | |
| Atleta | **G1 · Gestione anagrafica** | G1.6 · Elimina il proprio account | | | | F/L | |
| Atleta | **G2 · Gestione catalogo esercizi** | G2.1 · Consulta gli esercizi del catalogo pubblicati dall’admin, con immagini, video e spiegazione | | ● | | | ● |
| Atleta | **G3 · Gestione scheda** | G3.1 · Crea una scheda, a mano o con l’AI, scegliendo esercizi del catalogo e abbinando serie, ripetizioni e tempo; quella generata dall’AI richiede l’abbonamento AI attivo | ● | | | | |
| Atleta | **G3 · Gestione scheda** | G3.2 · Consulta le proprie schede e il dettaglio di ciascuna, con nota, data, esercizi, serie, ripetizioni e tempo | | ● | | | ● |
| Atleta | **G3 · Gestione scheda** | G3.3 · Aggiorna una scheda che ha creato caricandone una nuova; la precedente si chiude | ● | | ● | | |
| Atleta | **G3 · Gestione scheda** | G3.4 · Elimina una scheda che ha creato | | | | L | |
| Atleta | **G4 · Statistiche e misurazioni** | G4.1 · Consulta le proprie sessioni, esecuzioni ed errori | | | | | ● |
| Atleta | **G5 · Gestione inviti** | G5.1 · Visualizza un invito ricevuto, con coach e lobby | | ● | | | |
| Atleta | **G5 · Gestione inviti** | G5.2 · Visualizza il profilo del coach che invita, con certificazioni, esperienza e tariffa | | ● | | | |
| Atleta | **G5 · Gestione inviti** | G5.3 · Accetta un invito e attiva l’appartenenza alla lobby indicata | ● | | ● | | |
| Atleta | **G5 · Gestione inviti** | G5.4 · Rifiuta un invito modificandone lo stato | | | ● | | |
| Atleta | **G5 · Gestione inviti** | G5.5 · Consulta lo stato dei propri inviti | | | | | ● |
| Atleta | **G6 · Gestione diretta** | G6.1 · Imposta o rimuove la modalità privata della diretta | | | ● | | |
| Atleta | **G7 · Gestione acquisti** | G7.1 · Acquista un abbonamento AI | ● | | | | |
| Atleta | **G7 · Gestione acquisti** | G7.2 · Annulla l’abbonamento AI modificandone lo stato | | | ● | | |
| Atleta | **G7 · Gestione acquisti** | G7.3 · Consulta i propri abbonamenti | | | | | ● |
| Atleta | **G7 · Gestione acquisti** | G7.4 · Attiva un servizio coach in una lobby | ● | | | | |
| Atleta | **G7 · Gestione acquisti** | G7.5 · Paga una commissione riferita al servizio coach | ● | | | | |
| Atleta | **G7 · Gestione acquisti** | G7.6 · Interrompe il servizio coach modificandone lo stato | | | ● | | |
| Atleta | **G7 · Gestione acquisti** | G7.7 · Consulta i propri servizi coach | | | | | ● |
| Atleta | **G7 · Gestione acquisti** | G7.8 · Consulta i pagamenti effettuati | | | | | ● |
| Atleta | **G8 · Gestione allenamento** | G8.1 · Avvia una sessione, libera o su una delle proprie schede, e registra l’esecuzione | ● | | | | |
| Atleta | **G8 · Gestione allenamento** | G8.2 · Avvia il monitoraggio automatico, se l’abbonamento AI è attivo e la camera è accesa | ● | | | | |
| Atleta | **G8 · Gestione allenamento** | G8.3 · Avvia la diretta, se dispone di abbonamento AI o servizio coach attivo | ● | | | | |
| Atleta | **G8 · Gestione allenamento** | G8.4 · Visualizza il feedback di correttezza, se il monitoraggio AI è attivo | | ● | | | |
| Atleta | **G8 · Gestione allenamento** | G8.5 · Chiude la sessione, l’eventuale monitoraggio AI e l’eventuale diretta | | | ● | | |

**Coach**

| Stakeholder | Goal | Subgoal | C | R | U | D | S |
|---|---|---|---|---|---|---|---|
| Coach | **G1 · Gestione anagrafica** | G1.1 · Registra la propria anagrafica | ● | | | | |
| Coach | **G1 · Gestione anagrafica** | G1.2 · Visualizza il proprio profilo | | ● | | | |
| Coach | **G1 · Gestione anagrafica** | G1.3 · Modifica genere, foto, tariffa, livello di esperienza e link social | | | ● | | |
| Coach | **G1 · Gestione anagrafica** | G1.4 · Elimina il proprio account | | | | F/L | |
| Coach | **G2 · Gestione catalogo esercizi** | G2.1 · Consulta gli esercizi del catalogo pubblicati dall’admin, con immagini, video e spiegazione | | ● | | | ● |
| Coach | **G2 · Gestione catalogo esercizi** | G2.2 · Crea un esercizio privato, visibile solo a lui, con immagini, video e spiegazione | ● | | | | |
| Coach | **G2 · Gestione catalogo esercizi** | G2.3 · Consulta i propri esercizi privati | | ● | | | ● |
| Coach | **G3 · Gestione scheda** | G3.1 · Carica una scheda per un atleta scegliendo esercizi del catalogo o privati e abbinando serie, ripetizioni e tempo, con nota e data | ● | | | | |
| Coach | **G3 · Gestione scheda** | G3.2 · Consulta le schede e il dettaglio di ciascuna, con esercizi, serie, ripetizioni e tempo | | ● | | | ● |
| Coach | **G3 · Gestione scheda** | G3.3 · Aggiorna la scheda di un atleta caricandone una nuova con nota e data; la precedente si chiude | ● | | ● | | |
| Coach | **G3 · Gestione scheda** | G3.4 · Assegna la scheda all’atleta per cui l’ha caricata | ● | | | | |
| Coach | **G3 · Gestione scheda** | G3.5 · Chiude un’assegnazione; la scheda resta all’atleta | | | ● | | |
| Coach | **G4 · Statistiche e misurazioni** | G4.1 · Consulta sessioni, esecuzioni ed errori dei membri attivi delle proprie lobby con servizio attivo | | | | | ● |
| Coach | **G5 · Gestione inviti** | G5.1 · Crea un invito destinato a un atleta e a una propria lobby | ● | | | | |
| Coach | **G5 · Gestione inviti** | G5.2 · Consulta gli inviti | | | | | ● |
| Coach | **G5 · Gestione inviti** | G5.3 · Revoca un invito modificandone lo stato | | | ● | | |
| Coach | **G6 · Gestione diretta** | G6.1 · Entra nella diretta non privata di un membro attivo di una propria lobby con servizio attivo, se la sessione segue una scheda assegnata da lui con l’assegnazione ancora aperta; l’ingresso viene registrato | ● | ● | | | |
| Coach | **G7 · Gestione acquisti** | G7.1 · Sottoscrive un abbonamento coach | ● | | | | |
| Coach | **G7 · Gestione acquisti** | G7.2 · Visualizza il proprio abbonamento | | ● | | | |
| Coach | **G7 · Gestione acquisti** | G7.3 · Disdice l’abbonamento coach modificandone lo stato | | | ● | | |
| Coach | **G7 · Gestione acquisti** | G7.4 · Consulta le commissioni ricevute | | | | | ● |
| Coach | **G7 · Gestione acquisti** | G7.5 · Consulta i servizi coach erogati | | | | | ● |
| Coach | **G9 · Gestione lobby** | G9.1 · Crea una lobby come categoria di clienti | ● | | | | |
| Coach | **G9 · Gestione lobby** | G9.2 · Consulta le proprie lobby | | | | | ● |
| Coach | **G9 · Gestione lobby** | G9.3 · Consulta i membri attivi e chi è in allenamento | | | | | ● |
| Coach | **G9 · Gestione lobby** | G9.4 · Modifica nome, descrizione e numero massimo di partecipanti di una lobby | | | ● | | |
| Coach | **G10 · Gestione certificazioni** | G10.1 · Inserisce una certificazione | ● | | | | |
| Coach | **G10 · Gestione certificazioni** | G10.2 · Consulta le certificazioni | | | | | ● |
| Coach | **G10 · Gestione certificazioni** | G10.3 · Modifica una certificazione | | | ● | | |
| Coach | **G10 · Gestione certificazioni** | G10.4 · Elimina una certificazione | | | | F | |

## 2.3 Scambio di valore

Lo scambio di valore è il modello di business: le entità e i flussi di valore che intercorrono tra esse.

L’atleta fornisce a FIT AI il profilo e i dati delle sessioni. FIT AI gli restituisce la correzione del gesto, la scheda e lo storico. L’atleta paga a FIT AI l’abbonamento AI e ne riceve l’analisi del movimento.

L’atleta paga la commissione per il servizio del coach. FIT AI trattiene la quota della piattaforma e versa il resto al coach. In cambio, attraverso FIT AI, il coach consegna la scheda e il seguito in diretta.

Il coach paga a FIT AI l’abbonamento coach e riceve lobby, libreria esercizi, schede e diretta. Fornisce esercizi e schede; FIT AI gli restituisce le presenze degli atleti e i risultati delle esecuzioni.

![Scambio di valore tra atleta, FIT AI e coach](scambio-di-valore.svg)
