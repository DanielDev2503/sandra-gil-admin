export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado_envio, numero_guia, notas_admin } = body;

    const pedido = await prisma.pedido.update({
      where: { id },
      data: {
        ...(estado_envio ? { estado_envio } : {}),
        ...(numero_guia !== undefined ? { numero_guia } : {}),
        ...(notas_admin !== undefined ? { notas_admin } : {}),
      },
    });
    return NextResponse.json(pedido);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 });
  }
}
