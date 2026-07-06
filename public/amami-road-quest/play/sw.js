const CACHE = 'amami-road-quest-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './assets/icon.svg', './src/styles.css',
  './src/app.js', './src/data/routes.js', './src/core/route-engine.js', './src/core/game-engine.js',
  './src/core/storage.js', './src/providers/demo-panorama.js', './src/providers/google-embed-panorama.js'
];
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
// network-first: 常に最新を取得し、成功したらキャッシュ更新、失敗時のみキャッシュへフォールバック。
// 公開サイトで古い画面が残り続ける問題を防ぎつつ、デモ景観のオフライン利用を維持する。
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
