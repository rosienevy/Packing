/* Pack Check offline support.
   - Online: always fetches the latest page + CSV, and keeps a copy.
   - Offline: serves the last saved copy.
   If you ever change this file, bump CACHE (v1 -> v2) so phones refresh. */
const CACHE = "packcheck-v1";
const FILES = ["./", "index.html", "packingdata.csv"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // cache key ignores ?query (the page adds ?t=... to the CSV to avoid stale copies)
  const key = url.origin + url.pathname;

  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(key, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(key).then(hit => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
      )
  );
});
