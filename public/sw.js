const CACHE = "12clocks-v3";
const PRECACHE = ["/", "/index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      self.clients.claim();
      // Force all open tabs to reload with new version
      return self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

self.addEventListener("fetch", e => {
  // Network first — fall back to cache for offline
  e.respondWith(
    fetch(e.request, { cache: "no-store" }).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
