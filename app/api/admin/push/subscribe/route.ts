export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { endpoint, keys, usuario } = body;

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Endpoint es requerido y debe ser una URL válida' },
        { status: 400 }
      );
    }

    if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') {
      return NextResponse.json(
        { error: 'Las claves criptográficas (p256dh y auth) son requeridas' },
        { status: 400 }
      );
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        usuario: typeof usuario === 'string' ? usuario : 'admin',
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        usuario: typeof usuario === 'string' ? usuario : 'admin',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dispositivo registrado para recibir notificaciones push',
      id: subscription.id,
    });
  } catch (error) {
    console.error('Error al guardar suscripción push:', error);
    return NextResponse.json(
      { error: 'Error al registrar suscripción push en el servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json(
        { error: 'Endpoint es requerido para desuscribir' },
        { status: 400 }
      );
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({
      success: true,
      message: 'Dispositivo desuscrito correctamente',
    });
  } catch (error) {
    console.error('Error al eliminar suscripción push:', error);
    return NextResponse.json(
      { error: 'Error al eliminar suscripción push' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const count = await prisma.pushSubscription.count();
    return NextResponse.json({
      success: true,
      totalDispositivos: count,
    });
  } catch (error) {
    console.error('Error al consultar suscripciones push:', error);
    return NextResponse.json(
      { error: 'Error al consultar suscripciones' },
      { status: 500 }
    );
  }
}
