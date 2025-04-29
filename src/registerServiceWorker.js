if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/opfs-sw.js').then(
    (registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    },
    (err) => {
      console.error('Service Worker registration failed:', err);
    }
  );
}