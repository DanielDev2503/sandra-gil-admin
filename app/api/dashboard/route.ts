export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalVentas,
      pedidosMes,
      pedidosPendientes,
      stockBajo,
      ultimosPedidos,
      pedidosParaGraficas,
      velasBajoPedido,
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
      // Todos los pedidos pagados de los últimos 30 días (para gráficas)
      prisma.pedido.findMany({
        where: {
          estado_pago: 'pagado',
          creado_en: { gte: thirtyDaysAgo },
        },
        select: {
          total_pagado: true,
          estado_envio: true,
          ciudad: true,
          creado_en: true,
        },
      }),
      // Velas bajo pedido pendientes
      prisma.producto.count({
        where: { esBajoPedido: true, activo: true },
      }),
    ]);

    // ── Build chart data ──

    // 1. Ventas por día (últimos 30 días)
    const ventasPorDia: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      ventasPorDia[key] = 0;
    }
    for (const p of pedidosParaGraficas) {
      const key = new Date(p.creado_en).toISOString().slice(0, 10);
      if (ventasPorDia[key] !== undefined) {
        ventasPorDia[key] += p.total_pagado;
      }
    }
    const ventasDiarias = Object.entries(ventasPorDia).map(([fecha, monto]) => ({
      fecha,
      monto: Math.round(monto),
    }));

    // 2. Estado de pedidos (distribución)
    const estadosCont: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
    };
    for (const p of pedidosParaGraficas) {
      if (estadosCont[p.estado_envio] !== undefined) {
        estadosCont[p.estado_envio]++;
      }
    }
    const estadosPedidos = Object.entries(estadosCont).map(([estado, cantidad]) => ({
      estado,
      cantidad,
    }));

    // 3. Despachos por municipio
    const ciudadCont: Record<string, number> = {};
    for (const p of pedidosParaGraficas) {
      const city = p.ciudad || 'Sin ciudad';
      ciudadCont[city] = (ciudadCont[city] || 0) + 1;
    }
    const despachosPorCiudad = Object.entries(ciudadCont)
      .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 10);

    return NextResponse.json({
      totalVentas: totalVentas._sum.total_pagado ?? 0,
      pedidosMes,
      pedidosPendientes,
      stockBajo,
      ultimosPedidos,
      velasBajoPedido,
      // Chart data
      ventasDiarias,
      estadosPedidos,
      despachosPorCiudad,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      {
        error: 'Error al cargar métricas',
        totalVentas: 0,
        pedidosMes: 0,
        pedidosPendientes: 0,
        stockBajo: 0,
        velasBajoPedido: 0,
        ultimosPedidos: [],
        ventasDiarias: [],
        estadosPedidos: [],
        despachosPorCiudad: [],
      },
      { status: 500 }
    );
  }
}
