'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';

interface DashboardData {
  totalVentas: number;
  pedidosMes: number;
  pedidosPendientes: number;
  stockBajo?: number;
  velasBajoPedido?: number;
  ultimosPedidos: Array<{
    id: string;
    cliente_nombre: string;
    total_pagado: number;
    estado_envio: string;
    creado_en: string;
  }>;
  ventasDiarias: Array<{ fecha: string; monto: number }>;
  estadosPedidos: Array<{ estado: string; cantidad: number }>;
  despachosPorCiudad: Array<{ ciudad: string; cantidad: number }>;
}

const DEFAULT_DATA: DashboardData = {
  totalVentas: 0,
  pedidosMes: 0,
  pedidosPendientes: 0,
  ultimosPedidos: [],
  ventasDiarias: [],
  estadosPedidos: [],
  despachosPorCiudad: [],
};

const estadoEnvioConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  APPROVED: { label: 'Aprobado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  SHIPPED: { label: 'Enviado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  DELIVERED: { label: 'Entregado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DECLINED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const PIE_COLORS: Record<string, string> = {
  PENDING: '#eab308',
  APPROVED: '#3b82f6',
  SHIPPED: '#a855f7',
  DELIVERED: '#22c55e',
};

const PIE_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
};

const PIE_SERIES_COLORS = [
  '#e8b86d',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#6366f1',
];

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-white/5 rounded-lg" />
        <div className="h-4 w-32 bg-white/5 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltipVentas({ active, payload, label }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#e8b86d]">{formatCOP(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

function CustomTooltipPie({ active, payload }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const name = payload[0]?.name ?? '';
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-sm font-medium text-white">
        {PIE_LABELS[name] || name}: <span className="font-bold">{value}</span>
      </p>
    </div>
  );
}

function CustomTooltipPieChart({ active, payload }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const name = payload[0]?.name ?? '';
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-sm font-medium text-white">
        {name}: <span className="font-bold text-[#e8b86d]">{value} uds</span>
      </p>
    </div>
  );
}

function CustomTooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#e8b86d]">{payload[0]?.value ?? 0} pedidos</p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA);
  const [aromasMasVendidos, setAromasMasVendidos] = useState<Array<{ nombre: string; cantidad: number }>>([]);
  const [materialesMasVendidos, setMaterialesMasVendidos] = useState<Array<{ nombre: string; cantidad: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/dashboard').then((r) => r.json()).catch(() => ({})),
      fetch('/api/ordenes?limit=200').then((r) => r.json()).catch(() => ({})),
    ])
      .then(([resDashboard, resOrdenes]) => {
        if (resDashboard && typeof resDashboard === 'object') {
          setData({
            totalVentas: resDashboard?.totalVentas ?? 0,
            pedidosMes: resDashboard?.pedidosMes ?? 0,
            pedidosPendientes: resDashboard?.pedidosPendientes ?? 0,
            ultimosPedidos: Array.isArray(resDashboard?.ultimosPedidos) ? resDashboard.ultimosPedidos : [],
            ventasDiarias: Array.isArray(resDashboard?.ventasDiarias) ? resDashboard.ventasDiarias : [],
            estadosPedidos: Array.isArray(resDashboard?.estadosPedidos) ? resDashboard.estadosPedidos : [],
            despachosPorCiudad: Array.isArray(resDashboard?.despachosPorCiudad) ? resDashboard.despachosPorCiudad : [],
          });
          if (resDashboard?.error) {
            setError(resDashboard.error);
          }
        }

        // Aggregate Aromas & Materiales from items in APPROVED orders
        const ordenesList = resOrdenes?.pedidos ?? resDashboard?.ordenes ?? [];
        const aromasCount: Record<string, number> = {};
        const materialesCount: Record<string, number> = {};

        if (Array.isArray(ordenesList)) {
          /* eslint-disable @typescript-eslint/no-explicit-any */
          const approvedOrders = ordenesList.filter(
            (o: any) => o?.estado_pago?.toUpperCase() === 'APPROVED' || o?.estado_pago?.toLowerCase() === 'pagado'
          );

          approvedOrders.forEach((o: any) => {
            (o?.items ?? []).forEach((item: any) => {
              const aroma = item?.producto?.aroma || item?.aroma || 'Sin Aroma';
              const material = item?.producto?.material || item?.material || '100% Cera de Soya';
              const qty = item?.cantidad ?? 1;

              aromasCount[aroma] = (aromasCount[aroma] ?? 0) + qty;
              materialesCount[material] = (materialesCount[material] ?? 0) + qty;
            });
          });
          /* eslint-enable @typescript-eslint/no-explicit-any */
        }

        const aromasArr = Object.entries(aromasCount)
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        const materialesArr = Object.entries(materialesCount)
          .map(([nombre, cantidad]) => ({ nombre, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad);

        setAromasMasVendidos(aromasArr);
        setMaterialesMasVendidos(materialesArr);
      })
      .catch((err) => {
        console.error('Error fetching dashboard metrics:', err);
        setError('No se pudieron obtener las métricas del servidor.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const ultimosPedidos = data?.ultimosPedidos ?? [];
  const ventasDiarias = data?.ventasDiarias ?? [];
  const estadosPedidos = data?.estadosPedidos ?? [];
  const despachosPorCiudad = data?.despachosPorCiudad ?? [];

  const totalPedidosChart = (estadosPedidos ?? []).reduce((s, e) => s + (e?.cantidad ?? 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Resumen del negocio</p>
        </div>
      </div>

      {/* Error alert if API had issues */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid - 3 cards (Velas Bajo Pedido and Stock Alert removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          title="Ventas totales"
          value={formatCOP(data?.totalVentas ?? 0)}
          subtitle="Pedidos pagados"
          icon={TrendingUp}
          accent="bg-[#e8b86d]/10 text-[#e8b86d]"
        />
        <StatCard
          title="Pedidos este mes"
          value={String(data?.pedidosMes ?? 0)}
          subtitle="Pagados en el mes actual"
          icon={ShoppingBag}
          accent="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Por despachar"
          value={String(data?.pedidosPendientes ?? 0)}
          subtitle="Estado APPROVED"
          icon={Package}
          accent="bg-purple-500/10 text-purple-400"
        />
      </div>

      {/* Charts Row 1: Ventas Diarias & Estado de Pedidos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Ventas por día */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Ventas Diarias</h2>
          <p className="text-xs text-slate-500 mb-6">Últimos 30 días (COP)</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventasDiarias}>
                <defs>
                  <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8b86d" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e8b86d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={formatShortDate}
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  interval="preserveStartEnd"
                  tickCount={7}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={50}
                />
                <Tooltip content={<CustomTooltipVentas />} />
                <Line
                  type="monotone"
                  dataKey="monto"
                  stroke="#e8b86d"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: '#e8b86d', stroke: '#1a1a2e', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Estado de pedidos */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Estado de Pedidos</h2>
          <p className="text-xs text-slate-500 mb-6">Distribución últimos 30 días</p>
          <div className="flex items-center gap-6">
            <div className="h-[220px] w-[220px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(estadosPedidos ?? []).filter((e) => (e?.cantidad ?? 0) > 0)}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(estadosPedidos ?? [])
                      .filter((e) => (e?.cantidad ?? 0) > 0)
                      .map((entry) => (
                        <Cell
                          key={entry.estado}
                          fill={PIE_COLORS[entry.estado] || '#64748b'}
                        />
                      ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipPie />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              {(estadosPedidos ?? []).map((e) => {
                const cant = e?.cantidad ?? 0;
                const pct = totalPedidosChart > 0 ? ((cant / totalPedidosChart) * 100).toFixed(0) : '0';
                return (
                  <div key={e.estado} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[e.estado] || '#64748b' }}
                    />
                    <span className="text-sm text-slate-300 flex-1">
                      {PIE_LABELS[e.estado] || e.estado}
                    </span>
                    <span className="text-sm font-semibold text-white">{cant}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Aromas & Materiales Más Vendidos Pie Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        {/* Aromas Más Vendidos */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Aromas Más Vendidos</h2>
          <p className="text-xs text-slate-500 mb-6">Proporción de órdenes en estado APPROVED</p>
          <div className="flex items-center gap-6">
            <div className="h-[220px] w-[220px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={aromasMasVendidos}
                    dataKey="cantidad"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(aromasMasVendidos ?? []).map((_, idx) => (
                      <Cell key={idx} fill={PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipPieChart />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1 max-h-[220px] overflow-y-auto pr-1">
              {(aromasMasVendidos ?? []).map((item, idx) => {
                const totalAromas = (aromasMasVendidos ?? []).reduce((acc, curr) => acc + (curr?.cantidad ?? 0), 0);
                const pct = totalAromas > 0 ? (((item?.cantidad ?? 0) / totalAromas) * 100).toFixed(0) : '0';
                return (
                  <div key={item.nombre} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length] }}
                    />
                    <span className="text-sm text-slate-300 flex-1 truncate">{item.nombre}</span>
                    <span className="text-sm font-semibold text-white">{item?.cantidad ?? 0}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
              {(aromasMasVendidos?.length ?? 0) === 0 && (
                <p className="text-xs text-slate-500 py-4">No hay datos de aromas en órdenes aprobadas</p>
              )}
            </div>
          </div>
        </div>

        {/* Materiales Más Vendidos */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Materiales Más Vendidos</h2>
          <p className="text-xs text-slate-500 mb-6">Proporción de órdenes en estado APPROVED</p>
          <div className="flex items-center gap-6">
            <div className="h-[220px] w-[220px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={materialesMasVendidos}
                    dataKey="cantidad"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {(materialesMasVendidos ?? []).map((_, idx) => (
                      <Cell key={idx} fill={PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipPieChart />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 flex-1 max-h-[220px] overflow-y-auto pr-1">
              {(materialesMasVendidos ?? []).map((item, idx) => {
                const totalMat = (materialesMasVendidos ?? []).reduce((acc, curr) => acc + (curr?.cantidad ?? 0), 0);
                const pct = totalMat > 0 ? (((item?.cantidad ?? 0) / totalMat) * 100).toFixed(0) : '0';
                return (
                  <div key={item.nombre} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length] }}
                    />
                    <span className="text-sm text-slate-300 flex-1 truncate">{item.nombre}</span>
                    <span className="text-sm font-semibold text-white">{item?.cantidad ?? 0}</span>
                    <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
              {(materialesMasVendidos?.length ?? 0) === 0 && (
                <p className="text-xs text-slate-500 py-4">No hay datos de materiales en órdenes aprobadas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Despachos por municipio */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Despachos por Municipio</h2>
        <p className="text-xs text-slate-500 mb-6">Top destinos de envío</p>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={despachosPorCiudad}
              layout="vertical"
              margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="ciudad"
                stroke="#475569"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                width={120}
              />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar
                dataKey="cantidad"
                fill="#e8b86d"
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Pedidos recientes</h2>
          <Link
            href="/admin/ordenes"
            className="flex items-center gap-1.5 text-sm text-[#e8b86d] hover:text-[#d4a85a] transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {(ultimosPedidos?.length ?? 0) === 0 ? (
            <p className="text-center text-slate-500 py-12">No hay pedidos aún</p>
          ) : (
            (ultimosPedidos ?? []).map((p) => {
              const config = estadoEnvioConfig[p?.estado_envio] ?? estadoEnvioConfig.PENDING;
              const nombreCliente = p?.cliente_nombre || 'Cliente';
              const inicial = nombreCliente.charAt(0).toUpperCase();

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e8b86d]/10 flex items-center justify-center text-[#e8b86d] text-sm font-bold">
                      {inicial}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{nombreCliente}</p>
                      <p className="text-xs text-slate-500">
                        {p?.creado_en
                          ? new Date(p.creado_en).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full border ${config.color}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {formatCOP(p?.total_pagado ?? 0)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

