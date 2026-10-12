/* Ricettario Repub: copia dell'app sul telefono, per aprirla anche senza rete.
   - La pagina e le icone: prima la rete, se non c'è (o è lentissima) la copia salvata.
   - Il file delle ricette (dati.enc.json, sempre cifrato): prima la rete; la copia salvata si aggiorna
     solo con una versione uguale o più nuova (campo "rev"), mai con una più vecchia.
   - Le risposte prese dalla copia hanno l'intestazione "x-copia-locale" con la data in cui erano state salvate:
     l'app la usa per scrivere «Senza rete».
   - I salvataggi verso GitHub non passano di qui. */
var CACHE = "ricettario-copia";
var PAGINE = ["./", "index.html", "manifest.webmanifest", "icon.svg", "apple-touch-icon.png"];
var ATTESA = 4000; /* oltre 4 secondi senza risposta si usa la copia */

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(PAGINE.map(function (u) {
      return fetch(u, { cache: "no-store" }).then(function (r) { if (r.ok) return conData(r).then(function (x) { return c.put(u, x); }); }).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* copia della risposta con la data di salvataggio */
function conData(r) {
  return r.clone().blob().then(function (b) {
    var h = new Headers(r.headers);
    h.set("x-salvato", new Date().toISOString());
    return new Response(b, { status: r.status, statusText: r.statusText, headers: h });
  });
}
function dallaCopia(req, chiave) {
  return caches.open(CACHE).then(function (c) { return c.match(chiave || req, { ignoreSearch: true }); }).then(function (r) {
    if (!r) return Response.error();
    return r.blob().then(function (b) {
      var h = new Headers(r.headers);
      h.set("x-copia-locale", r.headers.get("x-salvato") || "");
      return new Response(b, { status: 200, headers: h });
    });
  });
}
/* la rete, ma non oltre ATTESA millisecondi */
function rete(req) {
  return new Promise(function (ok, no) {
    var t = setTimeout(function () { no(new Error("lenta")); }, ATTESA);
    fetch(req).then(function (r) { clearTimeout(t); ok(r); }, function (e) { clearTimeout(t); no(e); });
  });
}
function revDi(r) { return r.clone().json().then(function (j) { return +j.rev || 0; }).catch(function () { return -1; }); }

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;

  /* caratteri di Google: la copia se c'è, intanto si aggiorna */
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; }).catch(function () { return hit || Response.error(); });
        return hit || net;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  /* file delle ricette */
  if (/\/dati\.enc\.json$/.test(url.pathname)) {
    e.respondWith(rete(req).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      e.waitUntil(caches.open(CACHE).then(function (c) {
        return c.match("dati.enc.json").then(function (vecchio) {
          return Promise.all([revDi(r), vecchio ? revDi(vecchio) : -1]).then(function (rv) {
            if (rv[0] >= rv[1]) return conData(r).then(function (x) { return c.put("dati.enc.json", x); });
          });
        });
      }));
      return r;
    }).catch(function () { return dallaCopia(req, "dati.enc.json"); }));
    return;
  }

  /* pagina, manifest, icone */
  var chiave = req.mode === "navigate" ? "index.html" : null;
  e.respondWith(rete(req).then(function (r) {
    if (r.ok) e.waitUntil(caches.open(CACHE).then(function (c) { return conData(r).then(function (x) { return c.put(chiave || req, x); }); }));
    return r;
  }).catch(function () { return dallaCopia(req, chiave); }));
});
