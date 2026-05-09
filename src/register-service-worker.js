const isLocalhost = Boolean(
  window.location.hostname === 'localhost'
  || window.location.hostname === '127.0.0.1'
  || window.location.hostname === '[::1]',
);

if ('serviceWorker' in navigator && (import.meta.env.PROD || isLocalhost)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
