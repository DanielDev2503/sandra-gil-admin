export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    const material = await prisma.material.update({
      where: { id },
      data: {
        ...(nombre ? { nombre: nombre.trim() } : {}),
        ...(descripcion !== undefined ? { descripcion: descripcion ? String(descripcion).trim() : null } : {}),
        ...(activo !== undefined ? { activo: Boolean(activo) } : {}),
      },
    });

    revalidatePath('/admin/productos');
    revalidatePath('/catalogo');
    return NextResponse.json(material, { status: 200 });
  } catch (error) {
    console.error('Error PUT material:', error);
    return NextResponse.json({ error: 'Error al actualizar material' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.material.delete({ where: { id } });
    revalidatePath('/admin/productos');
    revalidatePath('/catalogo');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error DELETE material:', error);
    return NextResponse.json({ error: 'Error al eliminar material' }, { status: 500 });
  }
}
