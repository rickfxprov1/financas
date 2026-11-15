self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // O Chrome exige que exista um handler de fetch.
  // Vamos apenas repassar a requisição para a rede normalmente.
  event.respondWith(fetch(event.request));
});