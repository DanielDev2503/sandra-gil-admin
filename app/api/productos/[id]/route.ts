export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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

interface VariacionInput {
  id?: string;
  nombre: string;
  imagen: string;
  precio?: number | string | null;
  activo?: boolean;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar datos base del producto
      await tx.producto.update({
        where: { id },
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
          url_imagen,
          imagenes: Array.isArray(imagenes) ? imagenes : [],
          activo: activo ?? true,
          esBajoPedido: isBajoPedido,
        },
      });

      // 2. Gestionar variaciones
      if (isBajoPedido) {
        // Si el producto es marcado bajo pedido, eliminar cualquier variación existente
        await tx.variacionProducto.deleteMany({
          where: { productoId: id },
        });
      } else {
        const rawVariaciones: VariacionInput[] = Array.isArray(variaciones) ? variaciones : [];
        const validVariaciones = rawVariaciones.filter(
          (v) => v && typeof v.nombre === 'string' && v.nombre.trim() !== '' && typeof v.imagen === 'string' && v.imagen.trim() !== ''
        );

        // Obtener variaciones actuales en la base de datos
        const existingVariaciones = await tx.variacionProducto.findMany({
          where: { productoId: id },
          select: { id: true },
        });
        const existingIds = new Set(existingVariaciones.map((v) => v.id));

        const incomingIdsToKeep = new Set<string>();

        // Actualizar existentes y crear nuevas
        for (const v of validVariaciones) {
          const parsedPrice = v.precio !== null && v.precio !== undefined && v.precio !== ''
            ? parseFloat(String(v.precio))
            : null;

          if (v.id && existingIds.has(v.id)) {
            incomingIdsToKeep.add(v.id);
            await tx.variacionProducto.update({
              where: { id: v.id },
              data: {
                nombre: v.nombre.trim(),
                imagen: v.imagen.trim(),
                precio: parsedPrice,
                activo: v.activo ?? true,
              },
            });
          } else {
            const created = await tx.variacionProducto.create({
              data: {
                productoId: id,
                nombre: v.nombre.trim(),
                imagen: v.imagen.trim(),
                precio: parsedPrice,
                activo: v.activo ?? true,
              },
            });
            incomingIdsToKeep.add(created.id);
          }
        }

        // Eliminar variaciones que ya no están en la lista
        const toDeleteIds = existingVariaciones
          .map((v) => v.id)
          .filter((vId) => !incomingIdsToKeep.has(vId));

        if (toDeleteIds.length > 0) {
          await tx.variacionProducto.deleteMany({
            where: { id: { in: toDeleteIds } },
          });
        }
      }

      // Retornar producto con variaciones sincronizadas
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
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
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
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
