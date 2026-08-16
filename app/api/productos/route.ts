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
      include: {
        variaciones: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

interface VariacionInput {
  nombre: string;
  imagen: string;
  precio?: number | string | null;
  activo?: boolean;
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
      variaciones = [],
    } = body;

    const isJabon = tipo === 'JABON';
    const isBajoPedido = esBajoPedido === true;

    // Validación de variaciones si no es bajo pedido
    const rawVariaciones: VariacionInput[] = Array.isArray(variaciones) ? variaciones : [];
    const validVariaciones = isBajoPedido
      ? []
      : rawVariaciones.filter((v) => v && typeof v.nombre === 'string' && v.nombre.trim() !== '' && typeof v.imagen === 'string' && v.imagen.trim() !== '');

    const result = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          nombre,
          descripcion,
          tipo: isJabon ? 'JABON' : 'VELA',
          aroma: isJabon ? null : (aroma || null),
          aromaId: isJabon ? null : (aromaId || null),
          material: isJabon ? null : (material || null),
          materialId: isJabon ? null : (materialId || null),
          dimensiones: dimensiones ? String(dimensiones).trim() : null,
          precio: precio !== null && precio !== undefined && precio !== '' ? parseFloat(String(precio)) : null,
          stock: parseInt(String(stock || 0), 10),
          url_imagen: url_imagen || '',
          imagenes: Array.isArray(imagenes) ? imagenes : [],
          activo: activo ?? true,
          esBajoPedido: isBajoPedido,
          variaciones: validVariaciones.length > 0 ? {
            create: validVariaciones.map((v) => ({
              nombre: v.nombre.trim(),
              imagen: v.imagen.trim(),
              precio: v.precio !== null && v.precio !== undefined && v.precio !== '' ? parseFloat(String(v.precio)) : null,
              activo: v.activo ?? true,
            })),
          } : undefined,
        },
        include: {
          variaciones: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return producto;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}

