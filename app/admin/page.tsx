'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Flame,
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
  stockBajo: number;
  velasBajoPedido: number;
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
  stockBajo: 0,
  velasBajoPedido: 0,
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-36 bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
      </div>

      <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((resData) => {
        if (resData && typeof resData === 'object') {
          setData({
            totalVentas: resData.totalVentas ?? 0,
            pedidosMes: resData.pedidosMes ?? 0,
            pedidosPendientes: resData.pedidosPendientes ?? 0,
            stockBajo: resData.stockBajo ?? 0,
            velasBajoPedido: resData.velasBajoPedido ?? 0,
            ultimosPedidos: Array.isArray(resData.ultimosPedidos) ? resData.ultimosPedidos : [],
            ventasDiarias: Array.isArray(resData.ventasDiarias) ? resData.ventasDiarias : [],
            estadosPedidos: Array.isArray(resData.estadosPedidos) ? resData.estadosPedidos : [],
            despachosPorCiudad: Array.isArray(resData.despachosPorCiudad) ? resData.despachosPorCiudad : [],
          });
          if (resData.error) {
            setError(resData.error);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard:', err);
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

  const totalPedidosChart = estadosPedidos.reduce((s, e) => s + (e?.cantidad ?? 0), 0);

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
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
        <StatCard
          title="Velas Bajo Pedido"
          value={String(data?.velasBajoPedido ?? 0)}
          subtitle="Pendientes de fabricación"
          icon={Flame}
          accent="bg-orange-500/10 text-orange-400"
        />
        <StatCard
          title="Alertas de stock"
          value={String(data?.stockBajo ?? 0)}
          subtitle="Productos con menos de 5 uds"
          icon={AlertTriangle}
          accent={
            (data?.stockBajo ?? 0) > 0
              ? 'bg-red-500/10 text-red-400'
              : 'bg-green-500/10 text-green-400'
          }
        />
      </div>

      {/* Charts Row */}
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
          <h2 className="text-lg font-semibold text-[#ffffff] mb-1">Estado de Pedidos</h2>
          <p className="text-xs text-slate-500 mb-6">Distribución últimos 30 días</p>
          <div className="flex items-center gap-6">
            <div className="h-[220px] w-[220px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadosPedidos.filter((e) => (e?.cantidad ?? 0) > 0)}
                    dataKey="cantidad"
                    nameKey="estado"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {estadosPedidos
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
              {estadosPedidos.map((e) => {
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
          {ultimosPedidos.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No hay pedidos aún</p>
          ) : (
            ultimosPedidos.map((p) => {
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
