// Service worker de Vanys instalada como app (pantalla de inicio del iPhone,
// y más adelante Android).
//
// Hace UNA sola cosa: si se abre la app sin internet, muestra offline.html
// en vez de la pantalla de error del sistema (en una app instalada no hay
// barra de Safari para reintentar, así que el usuario quedaba atascado).
//
// A propósito NO cachea la API, los datos ni los assets del build: todas las
// pantallas se piden siempre a la red, así que cada despliegue nuevo se ve
// al instante y nunca se muestran datos viejos. Los assets ya traen su propio
// caché HTTP (hash en el nombre, ver grulla_be/src/server/index.server.ts).
//
// Al cambiar offline.html, subir la versión de OFFLINE_CACHE para que los
// teléfonos ya instalados descarguen la nueva.
const OFFLINE_CACHE = 'vanys-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      // cache: 'reload' evita guardar una copia vieja del caché HTTP.
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload: el navegador pide la página en paralelo mientras
      // arranca este worker, así abrir la app no se vuelve más lento.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();

      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== OFFLINE_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // Solo navegaciones (abrir la app, recargar, ir a otra pantalla por URL).
  // Las llamadas a la API, imágenes y scripts siguen su camino normal.
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        const offline = await cache.match(OFFLINE_URL);
        return offline ?? Response.error();
      }
    })(),
  );
});

// Notificaciones al teléfono (Web Push, ver grulla_be push_notification).
// El servidor manda { title, body, url, tag }; se muestra aunque la app esté
// cerrada. "tag" hace que un mismo pedido no se apile dos veces.
self.addEventListener('push', (event) => {
  const fallback = { title: 'Vanys', body: 'Tienes una novedad en Vanys.', url: '/', tag: undefined };
  let payload = fallback;
  try {
    payload = { ...fallback, ...(event.data ? event.data.json() : {}) };
  } catch {
    payload = { ...fallback, body: event.data ? event.data.text() : fallback.body };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      data: { url: payload.url },
    }),
  );
});

// Al tocar el aviso: si la app ya está abierta se lleva al frente en esa
// pantalla; si no, se abre. Solo se aceptan rutas de la propia app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data && event.notification.data.url;
  const target = new URL(typeof rawUrl === 'string' ? rawUrl : '/', self.location.origin);
  const url = target.origin === self.location.origin ? target.href : self.location.origin;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!existing) return self.clients.openWindow(url);
      await existing.focus();
      return existing.navigate(url).catch(() => self.clients.openWindow(url));
    })(),
  );
});
