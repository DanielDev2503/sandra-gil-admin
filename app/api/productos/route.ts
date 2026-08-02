export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const activo = searchParams.get('activo');
  const tipo = searchParams.get('tipo');
  const aroma = searchParams.get('aroma');
  const material = searchParams.get('material');
  const esBajoPedido = searchParams.get('esBajoPedido');

  try {
    const productos = await prisma.producto.findMany({
      where: {
        nombre: { contains: search, mode: 'insensitive' },
        ...(activo !== null && activo !== '' ? { activo: activo === 'true' } : {}),
        ...(tipo ? { tipo: tipo as 'VELA' | 'JABON' } : {}),
        ...(aroma ? { aroma: { contains: aroma, mode: 'insensitive' } } : {}),
        ...(material ? { material: { contains: material, mode: 'insensitive' } } : {}),
        ...(esBajoPedido === 'true' ? { esBajoPedido: true } : {}),
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
    const {
      nombre,
      descripcion,
      tipo = 'VELA',
      aroma,
      aromaId,
      material,
      materialId,
      dimensiones,
      precio,
      stock,
      url_imagen,
      imagenes,
      activo,
      esBajoPedido,
    } = body;

    const isJabon = tipo === 'JABON';

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        tipo: isJabon ? 'JABON' : 'VELA',
        aroma: isJabon ? null : (aroma || null),
        aromaId: isJabon ? null : (aromaId || null),
        material: isJabon ? null : (material || null),
        materialId: isJabon ? null : (materialId || null),
        dimensiones: dimensiones ? String(dimensiones).trim() : null,
        precio: parseFloat(String(precio)),
        stock: parseInt(String(stock), 10),
        url_imagen: url_imagen || '',
        imagenes: Array.isArray(imagenes) ? imagenes : [],
        activo: activo ?? true,
        esBajoPedido: esBajoPedido ?? false,
      },
    });
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

