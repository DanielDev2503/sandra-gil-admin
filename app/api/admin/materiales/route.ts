export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function GET() {
  try {
    const materiales = await prisma.material.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(materiales);
  } catch (error) {
    console.error('Error GET materiales:', error);
    return NextResponse.json({ error: 'Error al obtener materiales' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return NextResponse.json({ error: 'El nombre del material es obligatorio' }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion ? String(descripcion).trim() : null,
        activo: activo ?? true,
      },
    });

    revalidatePath('/admin/productos');
    revalidatePath('/catalogo');
    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error('Error POST material:', error);
    return NextResponse.json({ error: 'Error al crear material' }, { status: 500 });
  }
}
