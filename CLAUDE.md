# Ricettario Thomas Fonti

App su GitHub Pages: https://tommyfonti-art.github.io/ricettario-drink/ — tutto in `index.html` (+ `sw.js`, cartella `fb/` con i file di Firebase 11.10.0 copiati qui, con gli import riscritti in `./firebase-app.js`).

## Dove stanno i dati (dall'11 novembre 2026)
Firebase, progetto `ricettario-drink` (Firestore). Prima erano cifrati su GitHub in `dati.enc.json`: quel file è stato tolto, resta nella cronologia di git.
- raccolta `dati`: un documento per voce, id = `encodeURIComponent(sezione)+"~"+encodeURIComponent(id)`, campi `c` (sezione: ricette, lezioni, menu, appunti, archivio, bicchieri, serate, impostazioni, ingredienti, cose; «cose» = lista delle cose da fare: testo, fatto, creata, fattaIl, ric), `i` (id), `j` (la voce in JSON);
- raccolta `cronologia`: ogni salvataggio, con `ts`, `msg`, `chi`, `ch` (JSON delle voci prima `p` e dopo `n`); l'app la usa per annullare;
- raccolta `foto`: `foto/<encodeURIComponent(id ricetta)>` con `b64` (jpeg) e `v`.
Regole (testo in `firestore.rules`, da incollare a mano nella console di Firebase): entrano SOLO gli UID scritti nelle regole (dal 27 novembre 2026), perché su Firebase gratuito chiunque può crearsi un account. Leggono e scrivono tutto solo l'utente di Tommi e `claude@ricettario-drink.app`; l'utente ospiti (colleghi, UID `y9i2vGDPpDZz1ymdcVxFwqWK5yt2`) legge tutto e scrive solo le voci della lista «cose da fare» (`c` = `cose`). Ogni utente nuovo lo crea Tommi nella console e il suo UID va aggiunto alla funzione `ammesso()`.

## Come Claude modifica i dati
La password dell'utente di Claude NON è salvata da nessuna parte: chiederla a Tommi.
```
CLAUDE_PW=... node strumenti/firebase-claude.mjs scarica dati.json
# modifica dati.json
CLAUDE_PW=... node strumenti/firebase-claude.mjs carica dati.json "Descrizione della modifica"
```
`carica` scrive solo le differenze e aggiunge una voce in cronologia (annullabile dall'app). Servono i domini firestore/identitytoolkit/securetoken.googleapis.com consentiti nelle impostazioni di rete.

## Regole di lavoro
- Scrivere tutto in italiano, anche i commenti e i messaggi dell'app.
- Il `<meta name="versione-app">` lo cambia da solo GitHub a ogni pubblicazione (`.github/workflows/pubblica.yml`, Pages con sorgente «GitHub Actions»); `BUILD` va comunque cambiato a ogni modifica di `index.html`.
