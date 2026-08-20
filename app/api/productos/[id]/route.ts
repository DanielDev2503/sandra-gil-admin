export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { productoBaseSchema } from '@/lib/validations/producto';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        variaciones: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto por id:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 1. Validar con Zod
    const validation = productoBaseSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos del producto inválidos';
      return NextResponse.json(
        { error: firstError, details: validation.error.issues },
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
      variaciones = [],
    } = validation.data;

    const isJabon = tipo === 'JABON';
    const isBajoPedido = esBajoPedido === true;

    // Sincronización atómica de imágenes
    let syncImagenes = Array.from(new Set([url_imagen, ...(imagenes || [])])).filter(Boolean);
    if (syncImagenes.length === 0 && url_imagen) {
      syncImagenes = [url_imagen];
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del producto
      await tx.producto.update({
        where: { id },
        data: {
          nombre,
          descripcion,
          tipo,
          aroma: isJabon ? null : aroma,
          aromaId: isJabon ? null : aromaId,
          material: isJabon ? null : material,
          materialId: isJabon ? null : materialId,
          dimensiones: dimensiones ? String(dimensiones).trim() : null,
          precio,
          stock,
          url_imagen,
          imagenes: syncImagenes,
          activo,
          esBajoPedido,
        },
      });

      // 2. Gestionar variaciones
      if (isBajoPedido) {
        await tx.variacionProducto.deleteMany({
          where: { productoId: id },
        });
      } else {
        const validVariaciones = variaciones.filter(
          (v) => v.nombre.trim() !== '' && v.imagen.trim() !== ''
        );

        const existingVariaciones = await tx.variacionProducto.findMany({
          where: { productoId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingVariaciones.map((v) => v.id));
        const incomingIdsToKeep = new Set<string>();

        for (const v of validVariaciones) {
          if (v.id && existingIds.has(v.id)) {
            incomingIdsToKeep.add(v.id);
            await tx.variacionProducto.update({
              where: { id: v.id },
              data: {
                nombre: v.nombre.trim(),
                imagen: v.imagen.trim(),
                precio: v.precio ?? null,
                activo: v.activo,
              },
            });
          } else {
            const created = await tx.variacionProducto.create({
              data: {
                productoId: id,
                nombre: v.nombre.trim(),
                imagen: v.imagen.trim(),
                precio: v.precio ?? null,
                activo: v.activo,
              },
            });
            incomingIdsToKeep.add(created.id);
          }
        }

        const toDeleteIds = existingVariaciones
          .map((v) => v.id)
          .filter((vId) => !incomingIdsToKeep.has(vId));

        if (toDeleteIds.length > 0) {
          await tx.variacionProducto.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }
      }

      return tx.producto.findUnique({
        where: { id },
        include: {
          variaciones: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al actualizar producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.producto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
