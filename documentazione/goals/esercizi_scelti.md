# Selezione degli Esercizi per lo Studio di Fattibilità

## Obiettivo del Documento
Questo documento illustra i criteri tecnici e biomeccanici che hanno guidato la scelta di **tre esercizi campione** (**Squat**, **Push-up** e **Alzate laterali**) per validare l'architettura web basata su *computer vision* e *body tracking* . 

L'obiettivo non è coprire l'intero spettro del fitness al momento, ma costruire un **benchmark mirato** capace di stressare l'algoritmo di *pose estimation* su diversi piani spaziali, condizioni di ripresa e problematiche di tracciamento.

---

## 1. Squat (Ripresa laterale / angolata a 45°)

### Motivazione della scelta
Lo Squat rappresenta il test fondamentale per l'analisi della catena cinetica inferiore e della postura del busto su un piano sagittale/diagonale.

* **Validazione multi-articolare:** Permette di testare il calcolo simultaneo di più angoli critici (caviglia-ginocchio-anca per la profondità e anca-spalla per l'inclinazione della schiena).
* **Logica a stati (Macchina a Stati Finiti):** Offre un punto di inversione molto netto (il raggiungimento del parallelo), ideale per verificare l'affidabilità del conteggio automatico delle ripetizioni e l'attivazione di feedback correttivi in tempo reale.
* **Stress-test ambientale:** Consente di valutare la resilienza dei *keypoints* di anca e ginocchio in presenza di indumenti larghi, variazioni di prospettiva (ripresa a 45° anziché perfettamente laterale) o illuminazione non ottimale.

---

## 2. Push-up / Piegamenti sulle braccia (Ripresa laterale a terra)

### Motivazione della scelta
I piegamenti sulle braccia introducono la variabile più critica per i modelli di visione artificiale: il cambio di orientamento del corpo nello spazio.

* **Tracciamento su asse orizzontale:** La maggior parte dei modelli pre-addestrati è ottimizzata per soggetti in posizione eretta. Il Push-up verifica la capacità della libreria di mantenere uno scheletro coerente quando l'utente è parallelo al pavimento.
* **Analisi mista (dinamica + isometrica):** Combina il tracciamento del movimento ciclico dell'arto superiore (spalla-gomito-polso) con il controllo statico dell'allineamento del *core* (spalla-anca-caviglia), utile per rilevare compensi come il cedimento lombare.
* **Gestione delle occlusioni e dello spazio:** Permette di misurare l'impatto dell'auto-occlusione (il braccio più vicino alla camera copre quello opposto) e di definire i requisiti minimi di distanza/inquadratura necessari per una webcam standard da laptop.

---

## 3. Alzate Laterali (Ripresa frontale)

### Motivazione della scelta
Le alzate laterali rappresentano lo scenario d'uso più naturale per un'applicazione web (utente in piedi di fronte al computer) e spostano il focus sulla precisione fine e sulla simmetria.

* **Confronto bilaterale:** Lavorando su un piano frontale, consente di confrontare in tempo reale i vettori dell'arto destro e sinistro per individuare asimmetrie di esecuzione.
* **Rilevamento di micro-compensi:** Permette di testare la sensibilità del tracker su movimenti parassiti tipici, come l'elevazione involontaria delle spalle (attivazione eccessiva del trapezio) o l'inclinazione laterale del busto.
* **Stabilità del segnale (Jittering) e velocità:** Essendo un esercizio che coinvolge i *keypoints* distali (polsi) con un ampio arco di movimento, è ideale per testare i filtri di *smoothing* (es. filtro One Euro o media mobile) e calcolare la velocità angolare per segnalare esecuzioni troppo rapide o fatte di slancio.

---

## Sintesi Comparativa

| Esercizio | Piano / Ripresa | Focus Biomeccanico | Variabile Tecnica Testata |
| :--- | :--- | :--- | :--- |
| **Squat** | Diagonale / Laterale (in piedi) | Catena cinetica inferiore e inclinazione busto | Precisione angolare multipla e tolleranza alla prospettiva |
| **Push-up** | Laterale (a terra) | Spinta arti superiori e tenuta isometria *core* | Riconoscimento corpo orizzontale e gestione auto-occlusione |
| **Alzate laterali** | Frontale (in piedi) | Simmetria destra/sinistra e controllo motorio | Riduzione del rumore (*jittering*) e calcolo velocità |

## Conclusione
Superare con successo i test su questa triade garantisce che lo stack tecnologico scelto sia sufficientemente robusto da gestire la quasi totalità degli esercizi a corpo libero e con piccoli sovraccarichi, coprendo le tre casistiche geometriche principali (verticale frontale, verticale laterale/angolato, orizzontale).