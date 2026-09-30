import webpush from 'web-push';
import { prisma } from '@/lib/db';

let vapidConfigured = false;

function ensureVapidConfig(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:soporte@sandragil.com';

  if (!publicKey || !privateKey) {
    console.warn('[WebPush] Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY o VAPID_PRIVATE_KEY.');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export interface NotificacionPushPayload {
  titulo: string;
  mensaje: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

export interface ResultadoNotificacionPush {
  total: number;
  enviados: number;
  fallidos: number;
  eliminados: number;
}

/**
 * Envía una notificación Web Push a todos los dispositivos de administradores registrados.
 * Si una suscripción ha expirado (404/410), se elimina automáticamente de la base de datos.
 */
export async function notificarDispositivosAdmin(
  payload: NotificacionPushPayload
): Promise<ResultadoNotificacionPush> {
  const isReady = ensureVapidConfig();
  if (!isReady) {
    return { total: 0, enviados: 0, fallidos: 0, eliminados: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();

  if (subscriptions.length === 0) {
    return { total: 0, enviados: 0, fallidos: 0, eliminados: 0 };
  }

  const notificationPayload = JSON.stringify({
    titulo: payload.titulo,
    mensaje: payload.mensaje,
    url: payload.url || '/admin/ordenes',
    tag: payload.tag || 'pedido-nuevo',
    icon: payload.icon || '/logo-sandra.png',
    badge: payload.badge || '/logo-sandra.png',
  });

  let enviados = 0;
  let fallidos = 0;
  let eliminados = 0;

  const sendPromises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      // Timeout estricto de 4 segundos por endpoint para evitar que un push server bloquee la Serverless Function
      const pushPromise = webpush.sendNotification(pushSubscription, notificationPayload, {
        timeout: 4000,
        TTL: 3600,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Push notification timeout (>4s)')), 4000)
      );

      await Promise.race([pushPromise, timeoutPromise]);
      enviados++;
    } catch (err: unknown) {
      fallidos++;
      const statusCode = (err as { statusCode?: number })?.statusCode;
      // 404 Not Found o 410 Gone indican que la suscripción expiró o el permiso fue revocado
      if (statusCode === 404 || statusCode === 410) {
        try {
          await prisma.pushSubscription.delete({
            where: { endpoint: sub.endpoint },
          });
          eliminados++;
          console.log(`[WebPush] Suscripción eliminada por estado ${statusCode}: ${sub.endpoint.slice(0, 30)}...`);
        } catch {
          // Ignorar error si ya fue eliminada concurrentemente
        }
      } else {
        console.error(`[WebPush] Error enviando notificación a ${sub.endpoint.slice(0, 30)}...:`, err);
      }
    }
  });


  await Promise.allSettled(sendPromises);

  return {
    total: subscriptions.length,
    enviados,
    fallidos,
    eliminados,
  };
}
