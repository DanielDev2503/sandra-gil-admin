export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const activo = searchParams.get('activo');

  try {
    const productos = await prisma.producto.findMany({
      where: {
        nombre: { contains: search, mode: 'insensitive' },
        ...(activo !== null && activo !== '' ? { activo: activo === 'true' } : {}),
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, aroma, dimensiones, precio, stock, url_imagen, activo } = body;

    const producto = await prisma.producto.create({
      data: { nombre, descripcion, aroma, dimensiones, precio, stock, url_imagen, activo: activo ?? true },
    });
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
