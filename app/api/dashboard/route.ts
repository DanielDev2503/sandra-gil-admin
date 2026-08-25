export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const SABANA_MUNICIPIOS = [
  'chia',
  'chía',
  'cajica',
  'cajicá',
  'cota',
  'zipaquira',
  'zipaquirá',
  'sopo',
  'sopó',
  'tabio',
  'tenjo',
  'tocancipa',
  'tocancipá',
  'madrid',
  'mosquera',
  'funza',
  'la calera',
  'gachancipa',
  'gachancipá',
  'facatativa',
  'facatativá',
  'subachoque',
  'sesquile',
  'sesquilé',
  'guatavita',
  'nemocon',
  'nemocón',
  'cogua',
];

function normalizeCity(rawCity?: string | null): string {
  if (!rawCity || !rawCity.trim()) return 'Sin especificar';
  return rawCity.trim();
}

function classifyZone(cityName: string): 'Bogotá D.C.' | 'Sabana de Bogotá' | 'Otras Ciudades' {
  const norm = cityName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (norm.includes('bogota') || norm.includes('bogota d.c') || norm.includes('dc') || norm.includes('capital')) {
    return 'Bogotá D.C.';
  }

  for (const m of SABANA_MUNICIPIOS) {
    const normM = m
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (norm.includes(normM)) {
      return 'Sabana de Bogotá';
    }
  }

  return 'Otras Ciudades';
}

function normalizePaymentStatus(status?: string | null): 'APPROVED' | 'PENDING' | 'DECLINED' | 'VOIDED' {
  if (!status) return 'PENDING';
  const s = status.toUpperCase().trim();
  if (s === 'APPROVED' || s === 'PAGADO') return 'APPROVED';
  if (s === 'DECLINED' || s === 'FALLIDO' || s === 'RECHAZADO') return 'DECLINED';
  if (s === 'VOIDED' || s === 'ANULADO' || s === 'CANCELADO') return 'VOIDED';
  return 'PENDING';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();

    let fromDate: Date;
    let toDate: Date;

    if (fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)) {
      const [y, m, d] = fromParam.split('-').map(Number);
      fromDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    } else if (fromParam === 'all') {
      fromDate = new Date(Date.UTC(2020, 0, 1, 0, 0, 0, 0));
    } else {
      // Default: 30 days ago
      const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      fromDate = new Date(
        Date.UTC(
          thirtyDaysAgo.getFullYear(),
          thirtyDaysAgo.getMonth(),
          thirtyDaysAgo.getDate(),
          0,
          0,
          0,
          0
        )
      );
    }

    if (toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)) {
      const [y, m, d] = toParam.split('-').map(Number);
      toDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
    } else {
      toDate = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      );
    }

    // Ensure valid range
    if (fromDate > toDate) {
      const tmp = fromDate;
      fromDate = toDate;
      toDate = tmp;
    }

    const whereDateClause = {
      gte: fromDate,
      lte: toDate,
    };

    const [
      ventasAprobadasAggregate,
      pedidosEnRango,
      pedidosPendientesDespacho,
      stockBajo,
      velasBajoPedido,
      ultimosPedidos,
      itemsEnRango,
    ] = await Promise.all([
      // 1. Suma de ingresos y conteo de órdenes con pago APPROVED
      prisma.pedido.aggregate({
        where: {
          creado_en: whereDateClause,
          estado_pago: { in: ['APPROVED', 'pagado', 'approved', 'Pagado'] },
        },
        _sum: { total_pagado: true },
        _count: { id: true },
      }),
      // 2. Todos los pedidos del rango para serie temporal, embudo y zonas
      prisma.pedido.findMany({
        where: { creado_en: whereDateClause },
        select: {
          id: true,
          total_pagado: true,
          estado_pago: true,
          estado_envio: true,
          numero_guia: true,
          ciudad: true,
          creado_en: true,
        },
        orderBy: { creado_en: 'asc' },
      }),
      // 3. Despachos pendientes en órdenes pagadas (estado_envio === 'PENDING' o sin número de guía)
      prisma.pedido.count({
        where: {
          creado_en: whereDateClause,
          estado_pago: { in: ['APPROVED', 'pagado', 'approved', 'Pagado'] },
          OR: [
            { estado_envio: 'PENDING' },
            { numero_guia: null },
            { numero_guia: '' },
          ],
        },
      }),
      // 4. Productos con stock bajo (< 5)
      prisma.producto.count({
        where: { stock: { lt: 5 }, activo: true },
      }),
      // 5. Velas bajo pedido activas
      prisma.producto.count({
        where: { esBajoPedido: true, activo: true },
      }),
      // 6. Últimos 5 pedidos del periodo
      prisma.pedido.findMany({
        where: { creado_en: whereDateClause },
        take: 5,
        orderBy: { creado_en: 'desc' },
        select: {
          id: true,
          cliente_nombre: true,
          total_pagado: true,
          estado_pago: true,
          estado_envio: true,
          numero_guia: true,
          creado_en: true,
        },
      }),
      // 7. Items de pedidos aprobados para top aromas y materiales
      prisma.itemPedido.findMany({
        where: {
          pedido: {
            creado_en: whereDateClause,
            estado_pago: { in: ['APPROVED', 'pagado', 'approved', 'Pagado'] },
          },
        },
        select: {
          cantidad: true,
          aroma: true,
          producto: {
            select: {
              aroma: true,
              material: true,
              nombre: true,
            },
          },
        },
      }),
    ]);

    const totalVentas = ventasAprobadasAggregate._sum?.total_pagado ?? 0;
    const totalOrdenesAprobadas = ventasAprobadasAggregate._count?.id ?? 0;
    const ticketPromedio =
      totalOrdenesAprobadas > 0 ? Math.round(totalVentas / totalOrdenesAprobadas) : 0;

    // ── Build Daily Sales Series ──
    const dayMs = 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / dayMs);
    const maxDaysToIterate = Math.min(diffDays, 366); // Cap daily points to max 1 year for performance

    const ventasPorDia: Record<string, { monto: number; ordenes: number }> = {};

    if (maxDaysToIterate <= 62) {
      // Build continuous days map
      for (let i = 0; i <= maxDaysToIterate; i++) {
        const curDate = new Date(fromDate.getTime() + i * dayMs);
        if (curDate > toDate) break;
        const key = curDate.toISOString().slice(0, 10);
        ventasPorDia[key] = { monto: 0, ordenes: 0 };
      }
    }

    for (const p of pedidosEnRango) {
      const isApproved =
        p.estado_pago?.toUpperCase() === 'APPROVED' || p.estado_pago?.toLowerCase() === 'pagado';
      if (isApproved) {
        const key = new Date(p.creado_en).toISOString().slice(0, 10);
        if (!ventasPorDia[key]) {
          ventasPorDia[key] = { monto: 0, ordenes: 0 };
        }
        ventasPorDia[key].monto += p.total_pagado || 0;
        ventasPorDia[key].ordenes += 1;
      }
    }

    const ventasDiarias = Object.entries(ventasPorDia)
      .map(([fecha, stat]) => ({
        fecha,
        monto: Math.round(stat.monto),
        ordenes: stat.ordenes,
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    // ── Payment Status Breakdown (Funnel) ──
    const funnelCounts: Record<string, number> = {
      APPROVED: 0,
      PENDING: 0,
      DECLINED: 0,
      VOIDED: 0,
    };

    for (const p of pedidosEnRango) {
      const normalizedStatus = normalizePaymentStatus(p.estado_pago);
      funnelCounts[normalizedStatus] = (funnelCounts[normalizedStatus] || 0) + 1;
    }

    const estadosPago = [
      { estado: 'APPROVED', label: 'Aprobado', cantidad: funnelCounts.APPROVED },
      { estado: 'PENDING', label: 'Pendiente', cantidad: funnelCounts.PENDING },
      { estado: 'DECLINED', label: 'Declinado', cantidad: funnelCounts.DECLINED },
      { estado: 'VOIDED', label: 'Anulado', cantidad: funnelCounts.VOIDED },
    ];

    // ── Top Aromas & Top Materiales ──
    const aromasCount: Record<string, number> = {};
    const materialesCount: Record<string, number> = {};

    for (const item of itemsEnRango) {
      const aroma = item.aroma || item.producto?.aroma || 'Sin Aroma';
      const material = item.producto?.material || '100% Cera de Soya';
      const qty = item.cantidad || 1;

      aromasCount[aroma] = (aromasCount[aroma] || 0) + qty;
      materialesCount[material] = (materialesCount[material] || 0) + qty;
    }

    const topAromas = Object.entries(aromasCount)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const topMateriales = Object.entries(materialesCount)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // ── Geographic Distribution (Bogotá vs Sabana vs Otras) ──
    const geoCounts: Record<string, number> = {
      'Bogotá D.C.': 0,
      'Sabana de Bogotá': 0,
      'Otras Ciudades': 0,
    };

    const ciudadDetalleCount: Record<string, number> = {};

    for (const p of pedidosEnRango) {
      const isApproved =
        p.estado_pago?.toUpperCase() === 'APPROVED' || p.estado_pago?.toLowerCase() === 'pagado';
      if (isApproved) {
        const rawCity = normalizeCity(p.ciudad);
        const zone = classifyZone(rawCity);
        geoCounts[zone] = (geoCounts[zone] || 0) + 1;
        ciudadDetalleCount[rawCity] = (ciudadDetalleCount[rawCity] || 0) + 1;
      }
    }

    const totalGeoApproved = Object.values(geoCounts).reduce((a, b) => a + b, 0);
    const distribucionGeografica = Object.entries(geoCounts).map(([zona, cantidad]) => ({
      zona,
      cantidad,
      porcentaje: totalGeoApproved > 0 ? Math.round((cantidad / totalGeoApproved) * 100) : 0,
    }));

    const despachosPorCiudad = Object.entries(ciudadDetalleCount)
      .map(([ciudad, cantidad]) => ({ ciudad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);

    // Shipping status distribution
    const estadosEnvioCont: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      DECLINED: 0,
    };
    for (const p of pedidosEnRango) {
      if (estadosEnvioCont[p.estado_envio] !== undefined) {
        estadosEnvioCont[p.estado_envio]++;
      }
    }
    const estadosPedidos = Object.entries(estadosEnvioCont).map(([estado, cantidad]) => ({
      estado,
      cantidad,
    }));

    return NextResponse.json({
      // Summary KPIs
      totalVentas,
      totalOrdenesAprobadas,
      ticketPromedio,
      pedidosPendientes: pedidosPendientesDespacho,
      totalPedidosPeriodo: pedidosEnRango.length,
      stockBajo,
      velasBajoPedido,
      // Date range echoed
      rango: {
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      },
      // Analytics & Charts
      ventasDiarias,
      estadosPago,
      estadosPedidos,
      topAromas,
      topMateriales,
      distribucionGeografica,
      despachosPorCiudad,
      ultimosPedidos,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Error al cargar métricas del dashboard',
        totalVentas: 0,
        totalOrdenesAprobadas: 0,
        ticketPromedio: 0,
        pedidosPendientes: 0,
        totalPedidosPeriodo: 0,
        stockBajo: 0,
        velasBajoPedido: 0,
        rango: { from: '', to: '' },
        ventasDiarias: [],
        estadosPago: [],
        estadosPedidos: [],
        topAromas: [],
        topMateriales: [],
        distribucionGeografica: [],
        despachosPorCiudad: [],
        ultimosPedidos: [],
      },
      { status: 500 }
    );
  }
}
