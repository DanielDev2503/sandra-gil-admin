export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const aromas = await prisma.aroma.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(aromas);
  } catch (error) {
    console.error('Error GET aromas:', error);
    return NextResponse.json({ error: 'Error al obtener aromas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del aroma es obligatorio' }, { status: 400 });
    }

    const aroma = await prisma.aroma.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? String(descripcion).trim() : null,
        activo: activo ?? true,
      },
    });

    revalidatePath('/admin/productos');
    revalidatePath('/catalogo');
    return NextResponse.json(aroma, { status: 201 });
  } catch (error) {
    console.error('Error POST aroma:', error);
    return NextResponse.json({ error: 'Error al crear aroma' }, { status: 500 });
  }
}
