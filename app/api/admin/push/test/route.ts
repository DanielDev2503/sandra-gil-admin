export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { notificarDispositivosAdmin } from '@/lib/push-notifications';

export async function POST() {
  try {
    const resultado = await notificarDispositivosAdmin({
      titulo: '🔔 Notificación de Prueba',
      mensaje: 'El sistema de Web Push en Sandra Gil Admin está funcionando correctamente.',
      url: '/admin/ordenes',
      tag: 'test-notification',
    });

    return NextResponse.json({
      success: true,
      message:
        resultado.total > 0
          ? `Notificación enviada a ${resultado.enviados} de ${resultado.total} dispositivo(s).`
          : 'No hay dispositivos suscritos actualmente. Activa las notificaciones en tu navegador primero.',
      resultado,
    });
  } catch (error) {
    console.error('Error enviando notificación push de prueba:', error);
    return NextResponse.json(
      { error: 'Error al enviar notificación push de prueba' },
      { status: 500 }
    );
  }
}
