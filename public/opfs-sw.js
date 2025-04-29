// opfs-sw.js - Fixed Service Worker for OPFS model handling

self.addEventListener("install", (event) => {
  self.skipWaiting(); // Ensure new service worker activates immediately
  console.log("Service Worker installed");
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  // Take control of all clients immediately
  event.waitUntil(clients.claim());
});

// Helper function to validate GGUF file (if needed)
async function isValidGGUF(file) {
  try {
    // Read the first 4 bytes to check GGUF magic number
    const headerBuffer = await file.slice(0, 4).arrayBuffer();
    const headerText = new TextDecoder().decode(headerBuffer);
    const isValid = headerText === "GGUF";
    console.log(
      `GGUF validation: File has ${
        isValid ? "valid" : "invalid"
      } header: "${headerText}"`
    );
    return isValid;
  } catch (e) {
    console.error("Error validating GGUF file:", e);
    return false;
  }
}

// Service workers cannot access OPFS directly, so we'll use a different approach
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  console.log("Intercepting request for:", url.pathname);

  // Check if this is a model file request - any path containing the model filename
  if (url.pathname.includes("tinymistral-248m.q2_k.gguf")) {
    console.log("Model file requested, passing through to network");
    // Let it pass through to the network or to the browser's HTTP cache
    // The main thread will handle OPFS operations
    return;
  }

  // Special handling for prompt.json to ensure it's always fresh
  if (url.pathname.endsWith("/prompt.json")) {
    event.respondWith(
      fetch(event.request, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
    );
  }

  // Handle other API requests as needed
  if (url.pathname.startsWith("/api/")) {
    console.log("API request:", url.pathname);
    // Pass through API requests
    return;
  }
});

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  console.log("Service worker received message:", event.data?.type);

  if (event.data && event.data.type === "PING") {
    // Respond to ping messages for service worker health check
    event.ports[0].postMessage({
      type: "PONG",
      status: "alive",
      timestamp: Date.now(),
    });
  }
});

console.log("Service worker script loaded");
