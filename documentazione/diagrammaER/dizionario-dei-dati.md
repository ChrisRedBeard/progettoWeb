# 3.2 Dizionario dei dati

Spiegazione dei termini usati nel diagramma E-R (`schemaERWeb.drawio.xml`).

Un attributo senza indicazione è obbligatorio. `(0,1)` indica un attributo opzionale. La cardinalità `(min,max)` è quella scritta sul ramo dell’entità.

## Entità

ET: Utente
DESCRIZIONE: entità per le informazioni comuni a chi usa l’applicazione. Generalizzazione totale e sovrapposta `(t,s)` di Atleta e Coach: ogni utente è almeno uno dei due e può essere entrambi.
ATTRIBUTI:
A1: id_utente (chiave primaria)
A2: nome
A3: cognome
A4: email
A5: foto (0,1)
A6: genere
A7: stato (attivo, cancellato; con «cancellato» i dati personali sono rimossi)

ET: Atleta
DESCRIZIONE: specializzazione di Utente. È il cliente che si allena, segue le proprie schede e acquista l’abbonamento AI e il servizio di uno o più coach.
ATTRIBUTI:
A1: altezza
A2: peso
A3: obiettivo
A4: modalita_feedback (completa, solo_critici, spenta)
A5: data_consenso (0,1; consenso all’uso della camera)
A6: versione_consenso (0,1)
Eredita da Utente: id_utente, nome, cognome, genere, email, foto, stato.

ET: Coach
DESCRIZIONE: specializzazione di Utente. È il cliente che prepara esercizi e schede, segue gli atleti e riceve le commissioni.
ATTRIBUTI:
A1: link_social (0,N)
A2: livello_esperienza
A3: tariffa
Eredita da Utente: id_utente, nome, cognome, genere, email, foto, stato.

ET: Certificazione
DESCRIZIONE: entità per una qualifica dichiarata dal coach. È la promozione a entità dell’attributo multivalore «certificazioni».
ATTRIBUTI:
A1: id_certificazione (chiave primaria)
A2: titolo
A3: ente_rilascio
A4: data_conseguimento

ET: Abbonamento AI
DESCRIZIONE: entità per un periodo di analisi del movimento acquistato da un atleta. Ogni rinnovo è una nuova istanza.
ATTRIBUTI:
A1: id_abbonamento (chiave primaria)
A2: data_inizio
A3: data_fine
A4: importo
A5: stato

ET: Abbonamento coach
DESCRIZIONE: entità per un periodo di uso degli strumenti da coach. Stessi attributi dell’Abbonamento AI; le due entità si possono generalizzare in Abbonamento `(t,e)`.
ATTRIBUTI:
A1: id_abbonamento (chiave primaria)
A2: data_inizio
A3: data_fine
A4: importo
A5: stato

ET: Invito
DESCRIZIONE: richiesta inviata da un coach a un atleta per entrare in una lobby. Non è un’associazione: la stessa coppia può avere più inviti nel tempo (rifiutato e rinviato).
ATTRIBUTI:
A1: id_invito (chiave primaria)
A2: data_invio
A3: stato
A4: data_risposta (0,1)

ET: Conversazione
DESCRIZIONE: entità padre di Chat privata e Lobby. Generalizzazione totale ed esclusiva `(t,e)`: una conversazione è o uno a uno o di gruppo. Messaggi e videochiamate si collegano una sola volta al padre.
ATTRIBUTI:
A1: id_conversazione (chiave primaria)
A2: data_creazione

ET: Chat privata
DESCRIZIONE: specializzazione di Conversazione. Conversazione uno a uno, generata da un invito accettato.
ATTRIBUTI:
A1: stato
A2: data_chiusura (0,1)
Eredita da Conversazione: id_conversazione, data_creazione.

ET: Lobby
DESCRIZIONE: specializzazione di Conversazione. Gruppo degli atleti di un coach.
ATTRIBUTI:
A1: nome
A2: descrizione
A3: max_partecipanti
Eredita da Conversazione: id_conversazione, data_creazione.

ET: Messaggio
DESCRIZIONE: entità per un testo inviato in una conversazione. Può citare una sessione di allenamento.
ATTRIBUTI:
A1: id_messaggio (chiave primaria)
A2: testo
A3: data_ora

ET: Videochiamata
DESCRIZIONE: entità per una chiamata, di solito svolta in una conversazione. La diretta di allenamento è il caso in cui la conversazione è una lobby; la diretta privata con il solo monitoraggio AI non ha conversazione.
ATTRIBUTI:
A1: id_chiamata (chiave primaria)
A2: inizio
A3: fine (0,1)
A4: modalita_privata (boolean; false = il coach può accedere, true = accesso del coach bloccato; l’atleta la cambia in ogni momento)

ET: Pagamento commissione
DESCRIZIONE: entità per il compenso che un atleta versa al coach per il servizio, con la quota trattenuta dalla piattaforma.
ATTRIBUTI:
A1: id_pagamento (chiave primaria)
A2: data
A3: importo
A4: quota_piattaforma
A5: periodo

ET: Servizio coach
DESCRIZIONE: rapporto commerciale attivo tra un atleta e un coach, collocato in una lobby. È distinto dall’Abbonamento coach che il coach paga a FIT AI.
ATTRIBUTI:
A1: id_servizio (chiave primaria)
A2: data_inizio
A3: data_fine (0,1)
A4: stato
A5: tariffa_concordata

ET: Sessione allenamento
DESCRIZIONE: entità per un allenamento di un atleta, libero oppure basato su una scheda.
ATTRIBUTI:
A1: id_sessione (chiave primaria)
A2: inizio
A3: fine (0,1)

ET: Monitoraggio AI
DESCRIZIONE: monitoraggio automatico opzionale di una sessione. Esiste solo se l’atleta lo seleziona e dispone di un Abbonamento AI attivo.
ATTRIBUTI:
A1: id_monitoraggio (chiave primaria)
A2: inizio
A3: fine (0,1)
A4: stato

ET: Scheda
DESCRIZIONE: entità per il programma di esercizi di un atleta. Può essere scritta dal coach, a mano o con l’aiuto dell’AI. Una scheda caricata non si modifica: per aggiornarla se ne carica una nuova e la precedente si chiude. Un atleta può avere più schede aperte; quella attiva è la scheda seguita nella sessione in corso.
ATTRIBUTI:
A1: id_scheda (chiave primaria)
A2: nome
A3: data_creazione (data di caricamento)
A4: origine (manuale, consigli_AI, generata_AI, coach)
A5: stato (aperta, chiusa, eliminata)
A6: nota (0,1; messaggio che accompagna il caricamento, per esempio il motivo dell’aggiornamento)

ET: Esercizio
DESCRIZIONE: entità/tabella degli esercizi riusabili in più schede. L’attributo ambito distingue il catalogo (pubblicato dall’admin del sito, consultabile da tutti) dagli esercizi privati del coach (visibili solo al creatore, non presenti nel catalogo).
ATTRIBUTI:
A1: id_esercizio (chiave primaria)
A2: nome
A3: descrizione
A4: gruppo_muscolare
A5: ambito (catalogo, privato)
A6: stato (attivo, archiviato)

ET: Materiale esercizio
DESCRIZIONE: entità/tabella per immagini, video e spiegazione collegati a un esercizio. Un esercizio può avere più materiali.
ATTRIBUTI:
A1: id_materiale (chiave primaria)
A2: tipo (immagine, video, spiegazione)
A3: contenuto (URL del file oppure testo della spiegazione)
A4: ordine (0,1)

ET: Esecuzione esercizio
DESCRIZIONE: entità per una serie svolta dentro una sessione. Conserva il risultato, non la prescrizione della scheda.
ATTRIBUTI:
A1: id_esecuzione (chiave primaria)
A2: numero_serie (quale serie è questa)
A3: ripetizioni
A4: carico
A5: punteggio_correttezza (0,1; presente solo con monitoraggio AI)
A6: dati_tracking (0,1; traccia della posa presente solo con monitoraggio AI; gli errori rilevati sono l’entità Errore)

ET: Errore
DESCRIZIONE: entità per un errore di gesto rilevato durante un’esecuzione. Ha chiave propria perché, nella stessa ripetizione, lo stesso tipo può comparire più di una volta.
ATTRIBUTI:
A1: id_errore (chiave primaria)
A2: tipo
A3: ripetizione
A4: istante

ET: Modello AI
DESCRIZIONE: entità per una versione del modello che valuta le esecuzioni. La versione base non appartiene a un atleta; una versione personalizzata sì.
ATTRIBUTI:
A1: versione (chiave primaria)
A2: data_addestramento
A3: accuratezza

## Associazioni

REL: Scrive
DESCRIZIONE: autore del messaggio.
ENTITÀ: Utente (0,N) — Messaggio (1,1)
ATTRIBUTI: nessuno

REL: Partecipa
DESCRIZIONE: presenza di un utente in una videochiamata.
ENTITÀ: Utente (0,N) — Videochiamata (1,N)
ATTRIBUTI: nessuno

REL: Inviato in
DESCRIZIONE: conversazione che contiene il messaggio.
ENTITÀ: Messaggio (1,1) — Conversazione (0,N)
ATTRIBUTI: nessuno

REL: Svolta in
DESCRIZIONE: conversazione in cui avviene la videochiamata. La diretta privata con il solo monitoraggio AI non ne ha (V21).
ENTITÀ: Videochiamata (0,1) — Conversazione (0,N)
ATTRIBUTI: nessuno

REL: Diretta di
DESCRIZIONE: sessione a cui appartiene una videochiamata di allenamento. Le chiamate non legate a un allenamento e le sessioni senza diretta non partecipano.
ENTITÀ: Videochiamata (0,1) — Sessione allenamento (0,1)
ATTRIBUTI: nessuno

REL: Tagga
DESCRIZIONE: citazione di una sessione dentro un messaggio.
ENTITÀ: Messaggio (0,1) — Sessione allenamento (0,N)
ATTRIBUTI: nessuno

REL: Genera
DESCRIZIONE: chat privata nata da un invito. Solo un invito accettato genera la chat (vincolo V1).
ENTITÀ: Invito (0,1) — Chat privata (1,1)
ATTRIBUTI: nessuno

REL: Destinato all’atleta
DESCRIZIONE: atleta destinatario dell’invito.
ENTITÀ: Atleta (0,N) — Invito (1,1)
ATTRIBUTI: nessuno

REL: Inviato da
DESCRIZIONE: coach che invia l’invito.
ENTITÀ: Invito (1,1) — Coach (0,N)
ATTRIBUTI: nessuno

REL: Destinato a
DESCRIZIONE: lobby nella quale il coach invita l’atleta.
ENTITÀ: Invito (1,1) — Lobby (0,N)
ATTRIBUTI: nessuno

REL: Crea
DESCRIZIONE: coach che crea la lobby.
ENTITÀ: Coach (0,N) — Lobby (1,1)
ATTRIBUTI: nessuno

REL: Membro di
DESCRIZIONE: appartenenza di un atleta a una lobby. Un atleta può essere membro delle lobby di più coach; uscendo, l’appartenenza cambia stato e registra data_uscita.
ENTITÀ: Atleta (0,N) — Lobby (0,N)
ATTRIBUTI:
A1: stato
A2: data_ingresso (0,1)
A3: data_uscita (0,1)

REL: Acquista
DESCRIZIONE: acquisto di un abbonamento AI da parte di un atleta.
ENTITÀ: Atleta (0,N) — Abbonamento AI (1,1)
ATTRIBUTI: nessuno (data, importo e stato stanno sull’abbonamento)

REL: Effettua
DESCRIZIONE: atleta che paga la commissione.
ENTITÀ: Atleta (0,N) — Pagamento commissione (1,1)
ATTRIBUTI: nessuno

REL: Riceve
DESCRIZIONE: coach beneficiario della commissione.
ENTITÀ: Pagamento commissione (1,1) — Coach (0,N)
ATTRIBUTI: nessuno

REL: Acquista servizio
DESCRIZIONE: atleta che acquista il servizio del coach.
ENTITÀ: Atleta (0,N) — Servizio coach (1,1)
ATTRIBUTI: nessuno

REL: Eroga
DESCRIZIONE: coach che eroga il servizio.
ENTITÀ: Coach (0,N) — Servizio coach (1,1)
ATTRIBUTI: nessuno

REL: Collocato in
DESCRIZIONE: lobby nella quale viene gestito il servizio.
ENTITÀ: Servizio coach (1,1) — Lobby (0,N)
ATTRIBUTI: nessuno

REL: Riferito a
DESCRIZIONE: servizio coach al quale si riferisce il pagamento della commissione.
ENTITÀ: Pagamento commissione (1,1) — Servizio coach (0,N)
ATTRIBUTI: nessuno

REL: Sottoscrive
DESCRIZIONE: acquisto di un abbonamento coach.
ENTITÀ: Coach (0,N) — Abbonamento coach (1,1)
ATTRIBUTI: nessuno

REL: Possiede
DESCRIZIONE: certificazione dichiarata da un coach.
ENTITÀ: Coach (0,N) — Certificazione (1,1)
ATTRIBUTI: nessuno

REL: Esegue
DESCRIZIONE: atleta che svolge la sessione.
ENTITÀ: Atleta (0,N) — Sessione allenamento (1,1)
ATTRIBUTI: nessuno

REL: Appartiene
DESCRIZIONE: atleta a cui la scheda è intestata fin dal caricamento; anche la scheda del coach è per un atleta preciso.
ENTITÀ: Atleta (0,N) — Scheda (1,1)
ATTRIBUTI: nessuno

REL: Assegna
DESCRIZIONE: coach che consegna la scheda. Una scheda scritta dall’atleta non ha coach. Chiudere l’assegnazione termina il seguito del coach su quella scheda, ma la scheda resta aperta all’atleta (V23).
ENTITÀ: Coach (0,N) — Scheda (0,1)
ATTRIBUTI:
A1: data_assegnazione
A2: stato
A3: data_fine (0,1)

REL: Redige
DESCRIZIONE: coach autore della scheda. È distinta da Assegna perché una scheda può essere redatta prima di essere consegnata.
ENTITÀ: Coach (0,N) — Scheda (0,1)
ATTRIBUTI: nessuno

REL: Basata su
DESCRIZIONE: scheda seguita in una sessione. Una sessione libera non ha scheda.
ENTITÀ: Sessione allenamento (0,1) — Scheda (0,N)
ATTRIBUTI: nessuno

REL: Include
DESCRIZIONE: serie contenute in una sessione. Una sessione interrotta subito può non averne.
ENTITÀ: Sessione allenamento (0,N) — Esecuzione esercizio (1,1)
ATTRIBUTI: nessuno

REL: Monitora
DESCRIZIONE: monitoraggio AI opzionale associato alla sessione.
ENTITÀ: Sessione allenamento (0,1) — Monitoraggio AI (1,1)
ATTRIBUTI: nessuno

REL: Autorizzato da
DESCRIZIONE: abbonamento AI attivo che autorizza il monitoraggio.
ENTITÀ: Abbonamento AI (0,N) — Monitoraggio AI (1,1)
ATTRIBUTI: nessuno

REL: Crea esercizio
DESCRIZIONE: coach autore di un esercizio privato. Gli esercizi del catalogo (ambito = catalogo) non hanno coach; quelli privati sì.
ENTITÀ: Coach (0,N) — Esercizio (0,1)
ATTRIBUTI: nessuno

REL: Illustra
DESCRIZIONE: materiali (immagini, video, spiegazione) di un esercizio.
ENTITÀ: Esercizio (0,N) — Materiale esercizio (1,1)
ATTRIBUTI: nessuno

REL: Comprende
DESCRIZIONE: esercizi previsti da una scheda, con la prescrizione. L’atleta sceglie solo esercizi del catalogo; il coach può scegliere anche i propri privati. In entrambi i casi abbinano serie, ripetizioni e tempo. Una scheda si carica con almeno un esercizio.
ENTITÀ: Scheda (1,N) — Esercizio (0,N)
ATTRIBUTI:
A1: serie (quante serie svolgere)
A2: ripetizioni
A3: tempo (durata da eseguire)
A4: carico (0,1)
A5: recupero (0,1)
A6: ordine

REL: Relativa a
DESCRIZIONE: esercizio a cui si riferisce l’esecuzione (di catalogo o privato del coach).
ENTITÀ: Esecuzione esercizio (1,1) — Esercizio (0,N)
ATTRIBUTI: nessuno

REL: Rileva
DESCRIZIONE: errori di gesto osservati in un’esecuzione.
ENTITÀ: Esecuzione esercizio (0,N) — Errore (1,1)
ATTRIBUTI: nessuno

REL: Valuta
DESCRIZIONE: versione del modello che ha giudicato l’esecuzione.
ENTITÀ: Esecuzione esercizio (0,1) — Modello AI (0,N)
ATTRIBUTI: nessuno

REL: Addestra
DESCRIZIONE: uso delle esecuzioni come dati di addestramento di una versione del modello.
ENTITÀ: Esecuzione esercizio (0,N) — Modello AI (0,N)
ATTRIBUTI: nessuno

REL: Personalizza
DESCRIZIONE: atleta a cui appartiene una versione personalizzata del modello. Il modello base non ha atleta.
ENTITÀ: Atleta (0,N) — Modello AI (0,1)
ATTRIBUTI: nessuno
