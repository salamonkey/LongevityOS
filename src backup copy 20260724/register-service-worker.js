const isLocalhost = Boolean(
  window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.hostname === '[::1]',
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

// In local development we always disable and clear prior SW/caches
// so UI and version changes reflect immediately.
if ('serviceWorker' in navigator && !import.meta.env.PROD && isLocalhost) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (error) {
      console.warn('Failed to clear local service workers/caches.', error);
    }
  });
}
