// Strumento di Claude per leggere e modificare i dati del ricettario su Firebase (Firestore, via REST).
// Uso:
//   CLAUDE_PW=... node firebase-claude.mjs scarica dati.json        → tutti i dati in un file (stessa forma della vecchia copia di sicurezza)
//   CLAUDE_PW=... node firebase-claude.mjs carica dati.json "messaggio"  → salva solo le differenze, con una voce nella cronologia
//   CLAUDE_PW=... node firebase-claude.mjs foto-su <id> <file.json> → carica una foto ({b64:...}) nella raccolta «foto»
// I dati stanno nella raccolta «dati»: un documento per ogni voce, id = encodeURIComponent(sezione)+"~"+encodeURIComponent(id),
// campi c (sezione), i (id), j (la voce in JSON). Le modifiche finiscono anche nella raccolta «cronologia».
import fs from "node:fs";
const KEY = "AIzaSyD1Z_LzD13Vz44UbYxouZUtZi7Jc2QGSN4", PRJ = "ricettario-drink";
const EMAIL = process.env.CLAUDE_EMAIL || "claude@ricettario-drink.app", PW = process.env.CLAUDE_PW;
const BASE = `https://firestore.googleapis.com/v1/projects/${PRJ}/databases/(default)/documents`;
let TOK = null;
async function login() {
  if (!PW) throw new Error("Manca CLAUDE_PW");
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: EMAIL, password: PW, returnSecureToken: true }) });
  const j = await r.json(); if (!j.idToken) throw new Error("Accesso fallito: " + JSON.stringify(j.error)); TOK = j.idToken;
}
const H = () => ({ Authorization: "Bearer " + TOK, "Content-Type": "application/json" });
export const docId = (c, i) => encodeURIComponent(c) + "~" + encodeURIComponent(i);
async function scarica() {
  const d = {}; let pt = "";
  do {
    const r = await fetch(`${BASE}/dati?pageSize=300${pt ? "&pageToken=" + pt : ""}`, { headers: H() });
    const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error));
    for (const doc of j.documents || []) { const f = doc.fields; (d[f.c.stringValue] ||= {})[f.i.stringValue] = JSON.parse(f.j.stringValue); }
    pt = j.nextPageToken || "";
  } while (pt);
  return d;
}
function diff(a, b) {
  const ch = [];
  for (const c of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const A = a[c] || {}, B = b[c] || {};
    for (const i of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const p = A[i] === undefined ? null : A[i], n = B[i] === undefined ? null : B[i];
      if (JSON.stringify(p) !== JSON.stringify(n)) ch.push({ c, i, p, n });
    }
  }
  return ch;
}
const sv = (s) => ({ stringValue: s });
async function commit(writes) {
  for (let k = 0; k < writes.length; k += 400) {
    const r = await fetch(`${BASE}:commit`, { method: "POST", headers: H(), body: JSON.stringify({ writes: writes.slice(k, k + 400) }) });
    const j = await r.json(); if (j.error) throw new Error(JSON.stringify(j.error));
  }
}
const NAME = `projects/${PRJ}/databases/(default)/documents`;
async function carica(nuovi, msg) {
  const ora = await scarica(), ch = diff(ora, nuovi);
  if (!ch.length) { console.log("Nessuna differenza"); return; }
  const w = ch.map(({ c, i, n }) => n === null ? { delete: `${NAME}/dati/${docId(c, i)}` } : { update: { name: `${NAME}/dati/${docId(c, i)}`, fields: { c: sv(c), i: sv(i), j: sv(JSON.stringify(n)) } } });
  const ts = Date.now();
  w.push({ update: { name: `${NAME}/cronologia/${ts}-claude`, fields: { ts: { integerValue: String(ts) }, msg: sv(msg || "Modifica di Claude"), chi: sv("Claude"), ch: sv(JSON.stringify(ch)) } } });
  await commit(w);
  console.log(`Salvate ${ch.length} modifiche`);
}
const [cmd, a1, a2] = process.argv.slice(2);
await login();
if (cmd === "scarica") { const d = await scarica(); fs.writeFileSync(a1, JSON.stringify(d)); console.log("Scaricate", Object.entries(d).map(([k, v]) => k + " " + Object.keys(v).length).join(", ")); }
else if (cmd === "carica") await carica(JSON.parse(fs.readFileSync(a1, "utf8")), a2);
else if (cmd === "foto-su") { const o = JSON.parse(fs.readFileSync(a2, "utf8")); await commit([{ update: { name: `${NAME}/foto/${encodeURIComponent(a1)}`, fields: { b64: sv(o.b64), v: { integerValue: String(o.v || Date.now()) } } } }]); console.log("Foto salvata"); }
else console.log("Comandi: scarica, carica, foto-su");
