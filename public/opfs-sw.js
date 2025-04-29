self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept only the specific model file request
  if (url.pathname === '/models/tinymistral-248m.q2_k.gguf') {
    event.respondWith(
      (async () => {
        // OPFS is only available in secure contexts (HTTPS or localhost)
        if (!('storage' in navigator && 'getDirectory' in navigator.storage)) {
          return fetch(event.request); // fallback to network
        }
        try {
          const root = await navigator.storage.getDirectory();
          const fileHandle = await root.getFileHandle('tinymistral-248m.q2_k.gguf');
          const file = await fileHandle.getFile();
          return new Response(file, {
            status: 200,
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': file.size
            }
          });
        } catch (e) {
          // Not found in OPFS, fallback to network
          return fetch(event.request);
        }
      })()
    );
  }
});