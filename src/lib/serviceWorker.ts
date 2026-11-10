// Registra public/sw.js, que le da a la app instalada en el celular una
// pantalla "Sin conexión" propia (ver el comentario de sw.js).
// Solo en el build de producción: en desarrollo, un service worker se
// interpondría con la recarga en caliente de Vite.
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (error: unknown) {
      // No es crítico: la app funciona igual, solo sin la pantalla offline.
      console.warn('No se pudo registrar el service worker', error);
    }
  });
}
