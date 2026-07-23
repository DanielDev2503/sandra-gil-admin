export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalVentas,
      pedidosMes,
      pedidosPendientes,
      stockBajo,
      ultimosPedidos,
    ] = await Promise.all([
      // Suma total de ventas aprobadas
      prisma.pedido.aggregate({
        where: { estado_pago: 'pagado' },
        _sum: { total_pagado: true },
      }),
      // Pedidos este mes
      prisma.pedido.count({
        where: {
          creado_en: { gte: startOfMonth },
          estado_pago: 'pagado',
        },
      }),
      // Pedidos pendientes de envío
      prisma.pedido.count({
        where: { estado_envio: 'APPROVED', estado_pago: 'pagado' },
      }),
      // Productos con stock bajo (< 5)
      prisma.producto.count({
        where: { stock: { lt: 5 }, activo: true },
      }),
      // Últimos 5 pedidos
      prisma.pedido.findMany({
        take: 5,
        orderBy: { creado_en: 'desc' },
        where: { estado_pago: 'pagado' },
        select: {
          id: true,
          cliente_nombre: true,
          total_pagado: true,
          estado_envio: true,
          creado_en: true,
        },
      }),
    ]);

    return NextResponse.json({
      totalVentas: totalVentas._sum.total_pagado ?? 0,
      pedidosMes,
      pedidosPendientes,
      stockBajo,
      ultimosPedidos,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Error al cargar métricas' }, { status: 500 });
  }
}
