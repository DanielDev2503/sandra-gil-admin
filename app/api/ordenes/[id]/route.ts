export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { actualizarOrdenSchema } from '@/lib/validations/orden';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = actualizarOrdenSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos de orden inválidos';
      return NextResponse.json(
        { error: firstError, details: validation.error.issues },
        { status: 400 }
      );
    }

    const { estado_envio, numero_guia, notas_admin } = validation.data;

    const dataToUpdate: {
      estado_envio?: string;
      numero_guia?: string | null;
      notas_admin?: string | null;
    } = {};

    if (estado_envio) {
      dataToUpdate.estado_envio = estado_envio;
    }
    if (numero_guia !== undefined) {
      dataToUpdate.numero_guia = numero_guia;
    }
    if (notas_admin !== undefined) {
      dataToUpdate.notas_admin = notas_admin;
    }

    const pedido = await prisma.pedido.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(pedido);
  } catch (error: any) {
    console.error('Error al actualizar pedido:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar pedido' },
      { status: 500 }
    );
  }
}
