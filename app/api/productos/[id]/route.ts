export const dynamic = 'force-dynamic';

import { NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { deleteStorageFilesServer } from '@/lib/storage-server';
import { productoBaseSchema } from '@/lib/validations/producto';
import { generateSlug } from '@/lib/slug';


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

    // Autogenerar slug si no viene o sanitizarlo
    if (!body.slug && body.nombre) {
      body.slug = generateSlug(body.nombre);
    } else if (body.slug) {
      body.slug = generateSlug(body.slug);
    }

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
      variaciones = [],
    } = validation.data;

    const isJabon = tipo === 'JABON';
    const isBajoPedido = esBajoPedido === true;

    // Sincronización atómica de imágenes
    let syncImagenes = Array.from(new Set([url_imagen, ...(imagenes || [])])).filter(Boolean);
    if (syncImagenes.length === 0 && url_imagen) {
      syncImagenes = [url_imagen];
    }

    // Consultar estado previo para detectar imágenes reemplazadas o variaciones borradas
    const existingProduct = await prisma.producto.findUnique({
      where: { id },
      include: { variaciones: true },
    });

    const result = await prisma.$transaction(async (tx) => {

      // 1. Actualizar datos base del producto
      await tx.producto.update({
        where: { id },
        data: {
          nombre,
          slug,
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

      // 2. Gestionar variaciones y detectar variaciones eliminadas
      const deletedVarImages: string[] = [];

      if (isBajoPedido) {
        const varsToDelete = await tx.variacionProducto.findMany({
          where: { productoId: id },
          select: { imagen: true },
        });
        varsToDelete.forEach((v) => {
          if (v.imagen) deletedVarImages.push(v.imagen);
        });

        await tx.variacionProducto.deleteMany({
          where: { productoId: id },
        });
      } else {
        const validVariaciones = variaciones.filter(
          (v) => v.nombre.trim() !== '' && v.imagen.trim() !== ''
        );

        const existingVariaciones = await tx.variacionProducto.findMany({
          where: { productoId: id },
          select: { id: true, imagen: true },
        });
        const existingIds = new Set(existingVariaciones.map((v) => v.id));
        const incomingIdsToKeep = new Set<string>();

        for (const v of validVariaciones) {
          if (v.id && existingIds.has(v.id)) {
            incomingIdsToKeep.add(v.id);
            // Si la imagen de la variación cambió, registrar la anterior para borrado
            const oldVar = existingVariaciones.find((ev) => ev.id === v.id);
            if (oldVar && oldVar.imagen && oldVar.imagen !== v.imagen.trim()) {
              deletedVarImages.push(oldVar.imagen);
            }

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

        const removedVariaciones = existingVariaciones.filter(
          (v) => !incomingIdsToKeep.has(v.id)
        );

        removedVariaciones.forEach((v) => {
          if (v.imagen) deletedVarImages.push(v.imagen);
        });

        if (removedVariaciones.length > 0) {
          await tx.variacionProducto.deleteMany({
            where: { id: { in: removedVariaciones.map((v) => v.id) } },
          });
        }
      }

      const updated = await tx.producto.findUnique({
        where: { id },
        include: {
          variaciones: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return { updated, deletedVarImages };
    });

    // 3. Limpieza de imágenes huérfanas en Supabase Storage (las que ya no se usan)
    const newImageSet = new Set<string>([
      ...(result.updated?.imagenes || []),
      ...(result.updated?.variaciones?.map((v) => v.imagen) || []),
    ]);
    if (result.updated?.url_imagen) newImageSet.add(result.updated.url_imagen);

    const oldOrphanImages = [
      ...((existingProduct?.imagenes || []).filter((img) => !newImageSet.has(img))),
      ...result.deletedVarImages.filter((img) => !newImageSet.has(img)),
    ];
    if (existingProduct?.url_imagen && !newImageSet.has(existingProduct.url_imagen)) {
      oldOrphanImages.push(existingProduct.url_imagen);
    }

    if (oldOrphanImages.length > 0) {
      after(async () => {
        try {
          await deleteStorageFilesServer(oldOrphanImages, 'productos');
        } catch (storageErr) {
          console.error('[StorageCleanup] Error limpiando imágenes reemplazadas:', storageErr);
        }
      });
    }

    // 4. Disparar revalidación hacia la tienda pública y caché local de manera no bloqueante
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'https://sandragilvelas.com';
    const secret = process.env.REVALIDATION_SECRET;

    if (storeUrl && secret) {
      after(async () => {
        try {
          await fetch(`${storeUrl}/api/revalidate?secret=${secret}&path=/catalogo`, {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
          });
        } catch (err) {
          console.error('Error notificando revalidación a tienda pública:', err);
        }
      });
    }
    revalidatePath('/catalogo');
    revalidatePath('/admin/productos');

    return NextResponse.json(result.updated);
  } catch (error: any) {
    console.error('Error al actualizar producto:', error);

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

    // 1. Obtener producto y sus variaciones ANTES de eliminar para extraer las imágenes
    const producto = await prisma.producto.findUnique({
      where: { id },
      include: { variaciones: true },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Recolectar URLs de Supabase Storage para liberar la cuota de 1 GB
    const imagesToDelete: string[] = [];
    if (producto.url_imagen) imagesToDelete.push(producto.url_imagen);
    if (Array.isArray(producto.imagenes)) {
      imagesToDelete.push(...producto.imagenes);
    }
    for (const v of producto.variaciones || []) {
      if (v.imagen) imagesToDelete.push(v.imagen);
    }

    // 2. Eliminar el producto de la base de datos
    await prisma.producto.delete({ where: { id } });

    // 3. Eliminar archivos binarios de Supabase Storage de forma no bloqueante
    if (imagesToDelete.length > 0) {
      after(async () => {
        try {
          const { deleted, errors } = await deleteStorageFilesServer(imagesToDelete, 'productos');
          console.log(`[StorageCleanup] Producto ${id} eliminado: ${deleted.length} archivos borrados de Storage.`);
          if (errors.length > 0) {
            console.warn('[StorageCleanup] Advertencias al borrar archivos:', errors);
          }
        } catch (storageErr) {
          console.error('[StorageCleanup] Error eliminando imágenes del producto:', storageErr);
        }
      });
    }

    // 4. Disparar revalidación hacia la tienda pública y caché local
    const storeUrl = process.env.NEXT_PUBLIC_STORE_URL || 'https://sandragilvelas.com';
    const secret = process.env.REVALIDATION_SECRET;

    if (storeUrl && secret) {
      after(async () => {
        try {
          await fetch(`${storeUrl}/api/revalidate?secret=${secret}&path=/catalogo`, {
            method: 'POST',
            signal: AbortSignal.timeout(3000),
          });
        } catch (err) {
          console.error('Error notificando revalidación a tienda pública:', err);
        }
      });
    }
    revalidatePath('/catalogo');
    revalidatePath('/admin/productos');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}

