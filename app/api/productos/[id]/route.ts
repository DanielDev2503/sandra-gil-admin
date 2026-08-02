export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
    } = body;

    const isJabon = tipo === 'JABON';

    const producto = await prisma.producto.update({
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
        precio: parseFloat(String(precio)),
        stock: parseInt(String(stock), 10),
        url_imagen,
        imagenes: Array.isArray(imagenes) ? imagenes : [],
        activo,
        esBajoPedido: esBajoPedido ?? false,
      },
    });
    return NextResponse.json(producto);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
