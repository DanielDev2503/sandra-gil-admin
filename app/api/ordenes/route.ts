export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

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
