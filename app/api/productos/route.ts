export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { crearProductoSchema } from '@/lib/validations/producto';
import { generateSlug } from '@/lib/slug';

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

    // Autogenerar slug a partir del nombre si no viene presente
    if (!body.slug && body.nombre) {
      body.slug = generateSlug(body.nombre);
    } else if (body.slug) {
      body.slug = generateSlug(body.slug);
    }

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
      slug,
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
          slug,
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

    // 3. Disparar revalidación hacia la tienda pública y caché local
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'https://sandragilvelas.com';
    const secret = process.env.REVALIDATION_SECRET;

    if (storeUrl && secret) {
      fetch(`${storeUrl}/api/revalidate?secret=${secret}&path=/catalogo`, { method: 'POST' }).catch((err) =>
        console.error('Error notificando revalidación a tienda pública:', err)
      );
    }
    revalidatePath('/catalogo');
    revalidatePath('/admin/productos');

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear producto:', error);

    // Manejar colisión de clave única de Prisma P2002 para slug
    if (error?.code === 'P2002') {
      const targetStr = JSON.stringify(error?.meta?.target || '');
      if (targetStr.includes('slug') || error?.message?.includes('slug')) {
        return NextResponse.json(
          { error: 'El slug ya está en uso por otro producto' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: error?.message || 'Error interno al crear producto' },
      { status: 500 }
    );
  }
}
