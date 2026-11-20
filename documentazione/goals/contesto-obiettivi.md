# 1. Descrizione informale del contesto e degli obiettivi

Gestione degli atleti, dei coach e dei servizi di FIT AI, applicazione web per controllare la correttezza degli esercizi in palestra o a casa.

Il sistema risponde a quel problema. L’atleta inquadra il movimento con la camera del proprio dispositivo. Durante la serie l’applicazione conta le ripetizioni, assegna un punteggio di forma e segnala l’errore mentre il gesto è ancora in corso. A fine serie conserva il risultato: ripetizioni svolte, punteggio, errori, eventuale perdita dell’inquadratura. L’atleta può allenarsi da solo sul catalogo pubblico oppure seguire la scheda che gli ha assegnato un coach oppure seguire una scheda generata dall'AI.

**Informazioni sui clienti**

- Atleta (nome, cognome, genere, email, foto, altezza, peso, obiettivo)
- Coach (nome, cognome, genere, email, foto, link social, livello di esperienza, tariffa)

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
- Seguire la scheda del proprio coach a distanza, con serie, ripetizioni, carico e recupero
- All’avvio dell’allenamento, scegliere separatamente monitoraggio AI e diretta: con entrambe le abilitazioni si possono attivare entrambi; con il solo Abbonamento AI si può attivare il monitoraggio; con il solo Servizio coach si può attivare la diretta; senza abilitazioni si eseguono soltanto gli esercizi
- Se viene selezionato soltanto il monitoraggio AI, avviare la diretta in modalità privata e permettere all’atleta di renderla visibile durante l’allenamento
- Permettere al coach di entrare soltanto nelle dirette non private dei membri attivi delle proprie lobby con Servizio coach attivo
- Lasciare attivi allenamento e monitoraggio AI quando la diretta è privata; chiudendo l’allenamento si chiudono anche monitoraggio e diretta eventualmente attivi
- Conservare statistiche e misurazioni, come serie, punteggi ed errori, per valutare il miglioramento della performance nel tempo
