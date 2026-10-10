const C = 'laneguide-v3';
const PRE = ['./', './index.html', './icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
// Only these outside hosts are cached. Search and routing services are never cached.
const CACHEABLE = ['tile.openstreetmap.org', 'unpkg.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(PRE.map(u =>
    c.add(new Request(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' })).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function store(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(C).then(c => c.put(req, cp)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    // App files: network first (so updates arrive), cache when offline.
    e.respondWith(fetch(req).then(res => store(req, res)).catch(() =>
      caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (CACHEABLE.some(h => url.hostname.endsWith(h))) {
    // Map tiles and map library: cache first (works offline).
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => store(req, res)).catch(() => Response.error())));
  }
  // anything else (search, routing): straight to the network, never cached.
});
