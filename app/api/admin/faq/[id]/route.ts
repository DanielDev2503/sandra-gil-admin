export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { actualizarFaqSchema } from '@/lib/validations/faq';
import { revalidatePath } from 'next/cache';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const faq = await prisma.fAQ.findUnique({
      where: { id },
    });

    if (!faq) {
      return NextResponse.json({ error: 'Pregunta frecuente no encontrada' }, { status: 404 });
    }

    return NextResponse.json(faq);
  } catch (error: any) {
    console.error('Error al obtener FAQ por id:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener pregunta frecuente' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = actualizarFaqSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos de FAQ inválidos';
      return NextResponse.json(
        { error: firstError, details: validation.error.issues },
        { status: 400 }
      );
    }

    const dataToUpdate: any = {};
    if (validation.data.pregunta !== undefined) dataToUpdate.pregunta = validation.data.pregunta;
    if (validation.data.respuesta !== undefined) dataToUpdate.respuesta = validation.data.respuesta;
    if (validation.data.categoria !== undefined) dataToUpdate.categoria = validation.data.categoria.trim() || 'General';
    if (validation.data.orden !== undefined) dataToUpdate.orden = validation.data.orden;
    if (validation.data.activo !== undefined) dataToUpdate.activo = validation.data.activo;

    const faq = await prisma.fAQ.update({
      where: { id },
      data: dataToUpdate,
    });

    revalidatePath('/admin/faq');
    revalidatePath('/faq');

    return NextResponse.json(faq);
  } catch (error: any) {
    console.error('Error al actualizar FAQ:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar la pregunta frecuente' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.fAQ.delete({
      where: { id },
    });

    revalidatePath('/admin/faq');
    revalidatePath('/faq');

    return NextResponse.json({ success: true, message: 'Pregunta eliminada correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar FAQ:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar la pregunta frecuente' },
      { status: 500 }
    );
  }
}
