# Selezione degli Esercizi per lo Studio di Fattibilità

## Obiettivo del Documento

Questo documento illustra i criteri tecnici e biomeccanici che hanno guidato la scelta di **tre esercizi campione** (**Squat**, **Push-up** e **Plank**) per validare l'architettura web basata su *computer vision* e *body tracking* (client-side tramite webcam).

L'obiettivo non è coprire l'intero spettro del fitness, ma costruire un **benchmark mirato** capace di stressare l'algoritmo di *pose estimation* su diverse tipologie di esecuzione (dinamica vs. isometrica), condizioni di ripresa e problematiche di tracciamento.

## 1. Squat (Ripresa laterale / angolata a 45°)

### Motivazione della scelta

Lo Squat rappresenta il test fondamentale per l'analisi della catena cinetica inferiore e della postura del busto in posizione eretta.

* **Validazione multi-articolare:** Permette di testare il calcolo simultaneo di più angoli critici (caviglia-ginocchio-anca per la profondità e anca-spalla per l'inclinazione della schiena).

* **Logica a stati (Macchina a Stati Finiti):** Offre un punto di inversione molto netto (il raggiungimento del parallelo), ideale per verificare l'affidabilità del conteggio automatico delle ripetizioni e l'attivazione di feedback correttivi in tempo reale.

* **Stress-test ambientale:** Consente di valutare la resilienza dei *keypoints* di anca e ginocchio in presenza di indumenti larghi, variazioni di prospettiva (ripresa a 45° anziché perfettamente laterale) o illuminazione non ottimale.

## 2. Push-up / Piegamenti sulle braccia (Ripresa laterale a terra)

### Motivazione della scelta

I piegamenti sulle braccia introducono la variabile più critica per i modelli di visione artificiale: il movimento dinamico con il corpo orientato orizzontalmente.

* **Tracciamento dinamico su asse orizzontale:** La maggior parte dei modelli pre-addestrati è ottimizzata per soggetti in posizione eretta. Il Push-up verifica la capacità della libreria di mantenere uno scheletro coerente mentre l'utente si muove parallelamente al pavimento.

* **Analisi mista (dinamica + stabilizzazione):** Combina il tracciamento del movimento ciclico dell'arto superiore (spalla-gomito-polso) con il controllo dell'allineamento del *core* (spalla-anca-caviglia) durante la spinta.

* **Gestione delle occlusioni e dello spazio:** Permette di misurare l'impatto dell'auto-occlusione (il braccio più vicino alla camera copre quello opposto) e di definire i requisiti minimi di distanza/inquadratura necessari per una webcam standard da laptop.

## 3. Plank (Ripresa laterale a terra)

### Motivazione della scelta

Il Plank permette di validare una categoria funzionale completamente diversa rispetto ai due esercizi precedenti: il **lavoro isometrico (a tempo)** anziché il conteggio di ripetizioni.

* **Logica a timer condizionale:** A differenza degli esercizi dinamici, non richiede il rilevamento di picchi o inversioni di movimento. L'algoritmo deve attivare e mantenere un cronometro attivo solo finché i parametri posturali rientrano nelle soglie di sicurezza.

* **Precisione lineare e controllo dei compensi:** Si basa su una geometria semplice ma rigorosa: il mantenimento di un angolo prossimo a $180^\circ$ sull'asse **spalla-anca-caviglia** (tolleranza $\pm 10^\circ$) per rilevare immediatamente il cedimento lombare o l'innalzamento eccessivo del bacino, unito alla perpendicolarità dell'avambraccio al suolo (angolo **spalla-gomito-polso** intorno a $90^\circ$).

* **Gestione della confidenza dei keypoints:** Essendo un esercizio statico visto di profilo, è il banco di prova ideale per testare il filtraggio lato client basato sul *confidence score*, istruendo l'app a considerare esclusivamente il lato del corpo visibile alla webcam ed escludendo i punti occlusi.

## Sintesi Comparativa

| Esercizio | Modalità / Posizione | Focus Biomeccanico | Variabile Tecnica Testata | 
| ----- | ----- | ----- | ----- | 
| **Squat** | Dinamico / In piedi (45° o laterale) | Catena cinetica inferiore e inclinazione busto | Precisione angolare multipla e macchina a stati per ripetizioni | 
| **Push-up** | Dinamico / A terra (laterale) | Spinta arti superiori e tenuta durante il moto | Tracciamento movimento su asse orizzontale e auto-occlusione | 
| **Plank** | Isometrico / A terra (laterale) | Allineamento statico del *core* e stabilità | Logica a timer condizionale e selezione keypoints per confidenza | 

## Conclusione

Superare con successo i test su questa triade garantisce che lo stack tecnologico scelto sia in grado di gestire sia esercizi **dinamici a ripetizioni** (in piedi e a terra) sia esercizi **isometrici a tempo**, coprendo le principali logiche di calcolo necessarie per un'applicazione completa di fitness tracking.