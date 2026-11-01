// Startovní stránka (startpage.html) byla z webu odstraněna (11/2026).
// Tento service worker jen uklidí po té staré: smaže její mezipaměť a odregistruje se,
// aby zařízení, kde byla nainstalovaná jako aplikace, nezobrazovala starou verzi webu.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
