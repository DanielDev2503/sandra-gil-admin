// Service Worker para Web Push Notifications (Sandra Gil Admin)

self.addEventListener('install', (event) => {
  // Activar inmediatamente este nuevo Service Worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tomar control inmediato de todos los clientes abiertos
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { mensaje: event.data.text() };
    }
  }

  const titulo = data.titulo || data.title || 'Nuevo Pedido en Sandra Gil';
  const mensaje = data.mensaje || data.message || 'Se ha recibido un nuevo pedido en la tienda.';
  const destinoUrl = data.url || '/admin/ordenes';
  const icono = data.icon || '/logo-sandra.png';
  const badge = data.badge || '/logo-sandra.png';

  const options = {
    body: mensaje,
    icon: icono,
    badge: badge,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: destinoUrl,
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Ver Pedido',
      },
    ],
    tag: data.tag || 'nuevo-pedido',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(titulo, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/admin/ordenes';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Buscar si ya existe alguna pestaña abierta con la app
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }

      // 2. Si no hay pestañas abiertas, abrir una nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
