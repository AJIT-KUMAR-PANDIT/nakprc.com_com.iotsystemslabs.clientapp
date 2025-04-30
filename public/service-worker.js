// Create the mlc object that WebLLM expects
self.mlc = {};

// Cache name for our app
const CACHE_NAME = "webllm-app-cache-v1";

// Listen for the install event
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Install");
  // Skip waiting so the new service worker activates immediately
  self.skipWaiting();
});

// Listen for the activate event
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activate");
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// Listen for fetch events
self.addEventListener("fetch", (event) => {
  // Basic fetch handling - can be expanded as needed
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listen for message events (important for WebLLM)
self.addEventListener("message", (event) => {
  console.log("[ServiceWorker] Received message:", event.data);

  // If the message has ports, we need to respond to them
  if (event.ports && event.ports.length > 0) {
    event.ports[0].postMessage({ result: "success" });
  }

  // Handle specific message types for WebLLM
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "INIT_MLC":
        console.log("[ServiceWorker] Initializing MLC");
        if (event.ports && event.ports.length > 0) {
          event.ports[0].postMessage({ status: "ready" });
        }
        break;
      // Add other message type handlers as needed
    }
  }
});

console.log("[ServiceWorker] Script loaded");
