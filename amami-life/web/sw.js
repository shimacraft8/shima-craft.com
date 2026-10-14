const CACHE = "amami-local-v6";
const SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/theme-tokens.css",
  "/app.js",
  "/core.js",
  "/usage.js",
  "/assets/paper.svg",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith("amami-local-") && k !== CACHE)
              .map((k) => caches.delete(k)),
          ),
        ),
      self.clients.claim(),
    ]),
  );
});
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/v1/"))
    return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(url.pathname === "/" ? "/" : event.request),
    ),
  );
});
