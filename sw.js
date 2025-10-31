const CACHE_NAME = 'startpage-v1';
const CORE_ASSETS = [
  '/',            // pokud hostuješ startpage.html v kořeni (GitHub Pages = /startpage.html)
  '/startpage.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Cache-first pro statiku
  const isStatic = url.origin === location.origin ||
                   url.href.startsWith('https://cdnjs.cloudflare.com') ||
                   url.href.startsWith('https://fonts.googleapis.com');

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then(cached => cached ||
        fetch(e.request).then(r => {
          const respClone = r.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
          return r;
        }).catch(() => cached)
      )
    );
    return;
  }

  // Network-first pro API (počasí, golemio proxy, zprávy)
  e.respondWith(
    fetch(e.request).then(r => {
      const respClone = r.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
