# 1. Descrizione informale del contesto e degli obiettivi

Gestione degli atleti, dei coach e dei servizi di FIT AI, applicazione web per controllare la correttezza degli esercizi in palestra o a casa.

Il sistema risponde a quel problema. L’atleta inquadra il movimento con la camera del proprio dispositivo. Durante la serie l’applicazione conta le ripetizioni, assegna un punteggio di forma e segnala l’errore mentre il gesto è ancora in corso. A fine serie conserva il risultato: ripetizioni svolte, punteggio, errori, eventuale perdita dell’inquadratura. Gli esercizi sono memorizzati nella tabella Esercizio. Il catalogo è la raccolta degli esercizi pubblicati solo dall’admin del sito: atleta e coach lo consultano, ma non lo modificano. Il coach può inoltre creare esercizi privati, visibili solo a lui e non presenti nel catalogo. Per ogni esercizio una tabella Materiale esercizio conserva immagini, video e spiegazione. Quando creano una scheda, l’atleta sceglie esercizi dal catalogo; il coach può scegliere esercizi del catalogo oppure i propri privati; in entrambi i casi abbinano serie, ripetizioni e tempo da eseguire. L’atleta può allenarsi da solo oppure seguire una scheda, scritta a mano da lui o dal coach oppure generata dall’AI.

**Informazioni sui clienti**

- Atleta (nome, cognome, genere, email, foto, altezza, peso, obiettivo, consenso all’uso della camera, modalità del feedback vocale)
- Coach (nome, cognome, genere, email, foto, link social, livello di esperienza, tariffa)
- Certificazione del coach (titolo, ente di rilascio, data di conseguimento)

**Informazioni sui prodotti in vendita**

- Abbonamento AI (data di inizio, data di fine, importo, stato)
- Abbonamento coach (data di inizio, data di fine, importo, stato)
- Servizio del coach (data di inizio, data di fine, stato, tariffa concordata, atleta, coach, lobby)

**Informazioni sugli acquisti**

- Acquisto dell’abbonamento AI (data di inizio, data di fine, importo, stato, atleta)
- Acquisto dell’abbonamento coach (data di inizio, data di fine, importo, stato, coach)
- Attivazione del servizio coach (data di inizio, data di fine, stato, tariffa concordata, atleta, coach, lobby)
- Pagamento della commissione (data, importo, quota della piattaforma, periodo, atleta pagatore, coach beneficiario, servizio di riferimento)

**Obiettivi**

- Allenarsi e migliorare la performance anche a casa, senza dover essere in palestra
- Essere corretti sul gesto senza un istruttore accanto: con un abbonamento AI attivo, la camera monitora il gesto e segnala l’errore mentre la serie è in corso
- Usare la camera solo se lo si desidera: è facoltativa ma fortemente consigliata per un tracking ottimale, e l’atleta può accenderla o spegnerla in ogni momento
- Seguire la scheda del proprio coach a distanza, con serie, ripetizioni, carico e recupero
- Avere più schede, dei propri coach, scritte a mano o generate dall’AI, e scegliere a ogni allenamento quale seguire
- Essere seguito anche da più coach contemporaneamente, ognuno nella propria lobby
- All’avvio dell’allenamento, scegliere separatamente monitoraggio AI e diretta: con entrambe le abilitazioni si possono attivare entrambi; con il solo Abbonamento AI si può attivare il monitoraggio; con il solo Servizio coach si può attivare la diretta; senza abilitazioni si eseguono soltanto gli esercizi
- Se viene selezionato soltanto il monitoraggio AI, avviare la diretta in modalità privata, così l’atleta vede i consigli del tracking, e permettergli di renderla visibile durante l’allenamento
- Permettere al coach di entrare soltanto nelle dirette non private dei membri attivi delle proprie lobby con Servizio coach attivo, durante un allenamento su una scheda che ha assegnato lui e non ha ancora chiuso
- Lasciare attivi allenamento e monitoraggio AI quando la diretta è privata; chiudendo l’allenamento si chiudono anche monitoraggio e diretta eventualmente attivi
- Conservare statistiche e misurazioni, come serie, punteggi ed errori, per valutare il miglioramento della performance nel tempo
- Poter cancellare il proprio account e i propri dati personali
