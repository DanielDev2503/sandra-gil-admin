export const dynamic = 'force-dynamic';

import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/db';
import { notificarDispositivosAdmin } from '@/lib/push-notifications';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || searchParams.get('q');
  const estadoEnvio = searchParams.get('estado_envio');
  const estadoPago = searchParams.get('estado_pago');
  const ciudad = searchParams.get('ciudad');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20), 200);

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const whereClause: any = {};

    if (estadoEnvio && estadoEnvio.trim() !== '') {
      whereClause.estado_envio = estadoEnvio.trim();
    }

    if (estadoPago && estadoPago.trim() !== '') {
      const ep = estadoPago.trim();
      const epUpper = ep.toUpperCase();
      if (epUpper === 'APPROVED' || ep.toLowerCase() === 'pagado') {
        whereClause.estado_pago = { in: ['APPROVED', 'pagado', 'approved', 'Pagado'] };
      } else if (epUpper === 'PENDING' || ep.toLowerCase() === 'pendiente') {
        whereClause.estado_pago = { in: ['PENDING', 'pendiente', 'pending', 'Pendiente'] };
      } else if (epUpper === 'DECLINED' || ep.toLowerCase() === 'fallido' || ep.toLowerCase() === 'rechazado') {
        whereClause.estado_pago = { in: ['DECLINED', 'fallido', 'declined', 'Fallido', 'rechazado', 'RECHAZADO'] };
      } else if (epUpper === 'VOIDED' || ep.toLowerCase() === 'anulado' || ep.toLowerCase() === 'cancelado') {
        whereClause.estado_pago = { in: ['VOIDED', 'anulado', 'voided', 'Anulado', 'cancelado', 'CANCELADO'] };
      } else {
        whereClause.estado_pago = { contains: ep, mode: 'insensitive' as const };
      }
    }

    if (ciudad && ciudad.trim() !== '') {
      whereClause.ciudad = { contains: ciudad.trim(), mode: 'insensitive' as const };
    }

    if (fromParam || toParam) {
      whereClause.creado_en = {};
      if (fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)) {
        const [y, m, d] = fromParam.split('-').map(Number);
        whereClause.creado_en.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
        const [y, m, d] = toParam.split('-').map(Number);
        whereClause.creado_en.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      whereClause.OR = [
        { id: { contains: q, mode: 'insensitive' as const } },
        { id_transaccion_wompi: { contains: q, mode: 'insensitive' as const } },
        { cliente_nombre: { contains: q, mode: 'insensitive' as const } },
        { cliente_email: { contains: q, mode: 'insensitive' as const } },
        { cliente_telefono: { contains: q, mode: 'insensitive' as const } },
        { ciudad: { contains: q, mode: 'insensitive' as const } },
        { numero_guia: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where: whereClause,
        include: {
          items: {
            select: {
              id: true,
              cantidad: true,
              precio_unitario: true,
              aroma: true,
              variacion_id: true,
              variacion_nombre: true,
              variacion_imagen: true,
              producto: {
                select: { nombre: true, url_imagen: true, material: true, aroma: true },
              },
            },
          },
        },
        orderBy: { creado_en: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pedido.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      pedidos: pedidos ?? [],
      total: total ?? 0,
      page,
      limit,
      totalPages: Math.ceil((total ?? 0) / limit) || 1,
    });
  } catch (error: any) {
    console.error('Error al obtener pedidos:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener pedidos', pedidos: [], total: 0, page: 1, totalPages: 1 },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      cliente_nombre,
      cliente_email,
      cliente_telefono,
      ciudad,
      direccion_envio,
      notas_entrega,
      total_productos,
      costo_envio = 0,
      total_pagado,
      estado_pago = 'pendiente',
      id_transaccion_wompi,
      estado_envio = 'PENDING',
      numero_guia,
      notas_admin,
      items = [],
    } = body;

    if (!cliente_nombre || !cliente_email || !cliente_telefono || !ciudad || !direccion_envio) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios del cliente y dirección de envío' },
        { status: 400 }
      );
    }

    const nuevoPedido = await prisma.pedido.create({
      data: {
        cliente_nombre,
        cliente_email,
        cliente_telefono,
        ciudad,
        direccion_envio,
        notas_entrega,
        total_productos: Number(total_productos) || 0,
        costo_envio: Number(costo_envio) || 0,
        total_pagado: Number(total_pagado) || 0,
        estado_pago,
        id_transaccion_wompi,
        estado_envio,
        numero_guia,
        notas_admin,
        items:
          Array.isArray(items) && items.length > 0
            ? {
                create: items.map((it: {
                  producto_id: string;
                  variacion_id?: string | null;
                  variacion_nombre?: string | null;
                  variacion_imagen?: string | null;
                  cantidad?: number;
                  precio_unitario?: number;
                  aroma?: string | null;
                }) => ({
                  producto_id: it.producto_id,
                  variacion_id: it.variacion_id || null,
                  variacion_nombre: it.variacion_nombre || null,
                  variacion_imagen: it.variacion_imagen || null,
                  cantidad: Number(it.cantidad) || 1,
                  precio_unitario: Number(it.precio_unitario) || 0,
                  aroma: it.aroma || null,
                })),
              }
            : undefined,
      },
      include: {
        items: true,
      },
    });

    // Inyección no bloqueante de Web Push Notifications usando after() de Next.js (Vercel Best Practices)
    after(async () => {
      try {
        const totalFormateado = new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(nuevoPedido.total_pagado);

        await notificarDispositivosAdmin({
          titulo: `🕯️ ¡Nuevo Pedido en Sandra Gil!`,
          mensaje: `${nuevoPedido.cliente_nombre} • ${totalFormateado} (${nuevoPedido.ciudad})`,
          url: `/admin/ordenes`,
          tag: `pedido-${nuevoPedido.id}`,
        });
      } catch (pushErr) {
        console.error('[WebPush] Error no bloqueante notificando nuevo pedido:', pushErr);
      }
    });

    return NextResponse.json(nuevoPedido, { status: 201 });
  } catch (error: any) {
    console.error('Error al registrar pedido:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al registrar pedido' },
      { status: 500 }
    );
  }
}
