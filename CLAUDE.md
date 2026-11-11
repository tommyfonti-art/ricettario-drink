# Ricettario Thomas Fonti

App su GitHub Pages: https://tommyfonti-art.github.io/ricettario-drink/ — tutto in `index.html` (+ `sw.js`, cartella `fb/` con i file di Firebase 11.10.0 copiati qui, con gli import riscritti in `./firebase-app.js`).

## Dove stanno i dati (dall'11 novembre 2026)
Firebase, progetto `ricettario-drink` (Firestore). Prima erano cifrati su GitHub in `dati.enc.json`: quel file è stato tolto, resta nella cronologia di git.
- raccolta `dati`: un documento per voce, id = `encodeURIComponent(sezione)+"~"+encodeURIComponent(id)`, campi `c` (sezione: ricette, lezioni, menu, appunti, archivio, bicchieri, serate, impostazioni, ingredienti), `i` (id), `j` (la voce in JSON);
- raccolta `cronologia`: ogni salvataggio, con `ts`, `msg`, `chi`, `ch` (JSON delle voci prima `p` e dopo `n`); l'app la usa per annullare;
- raccolta `foto`: `foto/<encodeURIComponent(id ricetta)>` con `b64` (jpeg) e `v`.
Regole: leggono e scrivono solo l'utente di Tommi e `claude@ricettario-drink.app`.

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
- A ogni modifica di `index.html`: cambiare `BUILD` e il `<meta name="versione-app">`, così telefoni e iPad si aggiornano da soli.
