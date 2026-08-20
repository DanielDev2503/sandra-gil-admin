export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearProductoSchema } from '@/lib/validations/producto';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Validación estricta de entrada con Zod
    const validation = crearProductoSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos del producto inválidos';
      return NextResponse.json(
        {
          error: firstError,
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      nombre,
      descripcion,
      tipo,
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
      variaciones,
    } = validation.data;

    // 2. Transacción atómica en PostgreSQL
    const result = await prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          nombre,
          descripcion,
          tipo,
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
          variaciones:
            variaciones.length > 0
              ? {
                  create: variaciones.map((v) => ({
                    nombre: v.nombre,
                    imagen: v.imagen,
                    precio: v.precio ?? null,
                    activo: v.activo,
                  })),
                }
              : undefined,
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
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al crear producto' },
      { status: 500 }
    );
  }
}
