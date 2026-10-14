// Two caches: the app itself (replaced on every update) and saved map tiles (never deleted by updates).
const SHELL = 'lg-shell-v4', TILES = 'laneguide-v3';
const PRE = ['./', './index.html', './icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
// Only these outside hosts are cached. Search, routing and map-data services are never cached.
const TILE_HOST = 'tile.openstreetmap.org', LIB_HOST = 'unpkg.com';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(PRE.map(u =>
    c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function store(name, req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(name).then(c => c.put(req, cp)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // App files: network first (so updates arrive), cache when offline.
    e.respondWith(fetch(req).then(res => store(SHELL, req, res)).catch(() =>
      caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (url.hostname.endsWith(TILE_HOST) || url.hostname.endsWith(LIB_HOST)) {
    // Map tiles and map library: cache first (works offline).
    const name = url.hostname.endsWith(TILE_HOST) ? TILES : SHELL;
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => store(name, req, res)).catch(() => Response.error())));
  }
  // anything else: straight to the network, never cached.
});
