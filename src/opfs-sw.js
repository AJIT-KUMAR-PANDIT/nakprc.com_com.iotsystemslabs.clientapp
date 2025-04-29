self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  console.log('Intercepting fetch request:', event.request.url);
  event.respondWith(fetch(event.request));
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'PING') {
    console.log('Received PING from main thread');
    event.ports[0].postMessage({ type: 'PONG', timestamp: Date.now() });
  }
});