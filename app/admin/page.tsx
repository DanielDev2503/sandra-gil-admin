'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  ArrowRight,
  AlertCircle,
  Calendar,
  RefreshCw,
  DollarSign,
  Truck,
  MapPin,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
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

interface DashboardApiResponse {
  totalVentas?: number;
  totalOrdenesAprobadas?: number;
  ticketPromedio?: number;
  pedidosPendientes?: number;
  totalPedidosPeriodo?: number;
  stockBajo?: number;
  velasBajoPedido?: number;
  rango?: { from: string; to: string };
  ventasDiarias?: Array<{ fecha: string; monto: number; ordenes: number }>;
  estadosPago?: Array<{ estado: string; label: string; cantidad: number }>;
  estadosPedidos?: Array<{ estado: string; cantidad: number }>;
  topAromas?: Array<{ nombre: string; cantidad: number }>;
  topMateriales?: Array<{ nombre: string; cantidad: number }>;
  distribucionGeografica?: Array<{ zona: string; cantidad: number; porcentaje: number }>;
  despachosPorCiudad?: Array<{ ciudad: string; cantidad: number }>;
  ultimosPedidos?: Array<{
    id: string;
    cliente_nombre: string;
    total_pagado: number;
    estado_pago: string;
    estado_envio: string;
    numero_guia?: string | null;
    creado_en: string;
  }>;
  error?: string;
}

type PresetType = 'hoy' | '7dias' | '30dias' | 'mes' | 'ano' | 'todo' | 'custom';

const PAYMENT_COLORS: Record<string, string> = {
  APPROVED: '#10b981', // Verde
  PENDING: '#f59e0b',  // Ámbar / Amarillo
  DECLINED: '#ef4444', // Rojo
  VOIDED: '#64748b',   // Gris
};

const PAYMENT_LABELS: Record<string, string> = {
  APPROVED: 'Aprobado',
  PENDING: 'Pendiente',
  DECLINED: 'Declinado',
  VOIDED: 'Anulado',
};

const GEO_COLORS: Record<string, string> = {
  'Bogotá D.C.': '#e8b86d',
  'Sabana de Bogotá': '#3b82f6',
  'Otras Ciudades': '#8b5cf6',
};

const PIE_SERIES_COLORS = [
  '#e8b86d',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
];

const estadoEnvioBadge: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  APPROVED: { label: 'En Preparación', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  SHIPPED: { label: 'Enviado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  DELIVERED: { label: 'Entregado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DECLINED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function formatCOP(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function formatDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }
  return dateStr;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  badge,
  isAlert = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
  badge?: { text: string; color: string };
  isAlert?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[#1a1a2e] border rounded-2xl p-6 transition-all duration-300 group ${
        isAlert
          ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.08)] hover:border-amber-500/50'
          : 'border-white/5 hover:border-white/10'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="w-6 h-6" />
        </div>
        {badge && (
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${badge.color}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Filter bar skeleton */}
      <div className="h-20 bg-[#1a1a2e] border border-white/5 rounded-2xl p-4" />

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-36 bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        ))}
      </div>

      {/* Charts Grid skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
        <div className="h-[360px] bg-[#1a1a2e] border border-white/5 rounded-2xl p-6" />
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function CustomTooltipVentas({ active, payload, label }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const monto = payload[0]?.value ?? 0;
  const ordenes = payload[0]?.payload?.ordenes ?? 0;

  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl space-y-1">
      <p className="text-xs text-slate-400 font-medium">{formatDisplayDate(label)}</p>
      <p className="text-base font-bold text-[#e8b86d]">{formatCOP(monto)}</p>
      <p className="text-xs text-slate-400">
        Pedidos aprobados:{' '}
        <span className="font-semibold text-white">{ordenes}</span>
      </p>
    </div>
  );
}

function CustomTooltipDonut({ active, payload }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const name = payload[0]?.name ?? '';
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-sm font-medium text-white">
        {name}: <span className="font-bold text-[#e8b86d]">{value}</span>
      </p>
    </div>
  );
}

function CustomTooltipBar({ active, payload, label }: any) {
  if (!active || !payload?.length || !payload[0]) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-[#e8b86d]">{value} envíos pagados</p>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date Range States (Default: Last 30 days)
  const [activePreset, setActivePreset] = useState<PresetType>('30dias');
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return formatDateString(d);
  });
  const [fechaFin, setFechaFin] = useState<string>(() => {
    return formatDateString(new Date());
  });

  const calculateDatesForPreset = useCallback((preset: PresetType) => {
    const now = new Date();
    const todayStr = formatDateString(now);

    if (preset === 'hoy') {
      return { from: todayStr, to: todayStr };
    }
    if (preset === '7dias') {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: formatDateString(d), to: todayStr };
    }
    if (preset === '30dias') {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: formatDateString(d), to: todayStr };
    }
    if (preset === 'mes') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateString(startOfMonth), to: todayStr };
    }
    if (preset === 'ano') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: formatDateString(startOfYear), to: todayStr };
    }
    if (preset === 'todo') {
      return { from: 'all', to: todayStr };
    }
    return { from: fechaInicio, to: fechaFin };
  }, [fechaInicio, fechaFin]);

  const fetchMetrics = useCallback(async (from: string, to: string, isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Error del servidor (${res.status})`);
      }
      const json: DashboardApiResponse = await res.json();
      setData(json);
      if (json.error) {
        setError(json.error);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.message || 'No se pudieron obtener las métricas del servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const { from, to } = calculateDatesForPreset('30dias');
    fetchMetrics(from, to);
  }, [calculateDatesForPreset, fetchMetrics]);

  // Handle Preset Clicks
  const handlePresetSelect = (preset: PresetType) => {
    setActivePreset(preset);
    const { from, to } = calculateDatesForPreset(preset);
    if (preset !== 'todo') {
      setFechaInicio(from);
      setFechaFin(to);
    } else {
      setFechaInicio('2020-01-01');
      setFechaFin(to);
    }
    fetchMetrics(from, to);
  };

  // Handle Manual Apply Dates
  const handleApplyCustomDates = () => {
    setActivePreset('custom');
    fetchMetrics(fechaInicio, fechaFin);
  };

  const handleRefresh = () => {
    const from = activePreset === 'todo' ? 'all' : fechaInicio;
    fetchMetrics(from, fechaFin, true);
  };

  // Memoized calculations and defensive fallbacks
  const totalVentas = data?.totalVentas ?? 0;
  const totalOrdenesAprobadas = data?.totalOrdenesAprobadas ?? 0;
  const ticketPromedio = data?.ticketPromedio ?? 0;
  const pedidosPendientes = data?.pedidosPendientes ?? 0;

  const ventasDiarias = useMemo(() => data?.ventasDiarias || [], [data?.ventasDiarias]);
  const estadosPago = useMemo(() => data?.estadosPago || [], [data?.estadosPago]);
  const topAromas = useMemo(() => data?.topAromas || [], [data?.topAromas]);
  const topMateriales = useMemo(() => data?.topMateriales || [], [data?.topMateriales]);
  const distribucionGeografica = useMemo(() => data?.distribucionGeografica || [], [data?.distribucionGeografica]);
  const despachosPorCiudad = useMemo(() => data?.despachosPorCiudad || [], [data?.despachosPorCiudad]);
  const ultimosPedidos = useMemo(() => data?.ultimosPedidos || [], [data?.ultimosPedidos]);

  const totalTransaccionesPeriodo = useMemo(
    () => estadosPago.reduce((acc, curr) => acc + (curr?.cantidad ?? 0), 0),
    [estadosPago]
  );

  const totalTopAromas = useMemo(
    () => topAromas.reduce((acc, curr) => acc + (curr?.cantidad ?? 0), 0),
    [topAromas]
  );

  const formatShortDay = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'UTC' });
    }
    return dateStr;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Dashboard Analítico
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#e8b86d]/10 text-[#e8b86d] border border-[#e8b86d]/20">
              Sandra Gil Velas
            </span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Control financiero, estado de transacciones y logística de despachos en tiempo real
          </p>
        </div>

        {/* Visual Range Indicator Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 w-fit">
          <Calendar className="w-4 h-4 text-[#e8b86d]" />
          <span>
            {activePreset === 'todo'
              ? 'Mostrando datos del histórico completo'
              : `Mostrando datos del ${formatDisplayDate(fechaInicio)} al ${formatDisplayDate(fechaFin)}`}
          </span>
        </div>
      </div>

      {/* Control Temporal: Selector de Rango de Fechas & Presets Rápidos */}
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#e8b86d]" />
              Presets:
            </span>
            {[
              { id: 'hoy', label: 'Hoy' },
              { id: '7dias', label: 'Últimos 7 días' },
              { id: '30dias', label: 'Últimos 30 días' },
              { id: 'mes', label: 'Este Mes' },
              { id: 'ano', label: 'Año Actual' },
              { id: 'todo', label: 'Histórico Completo' },
            ].map((p) => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id as PresetType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e8b86d] text-[#1a1a2e] shadow-md shadow-[#e8b86d]/20 scale-105'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            title="Refrescar métricas"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#e8b86d]' : ''}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Date Inputs Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-medium">Rango Personalizado:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Input Fecha Inicial */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-[#e8b86d]/50 focus-within:ring-2 focus-within:ring-[#e8b86d]/20">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Desde:</span>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => {
                  setFechaInicio(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Input Fecha Final */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-[#e8b86d]/50 focus-within:ring-2 focus-within:ring-[#e8b86d]/20">
              <span className="text-[11px] text-slate-500 font-semibold uppercase">Hasta:</span>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setActivePreset('custom');
                }}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>

            {/* Apply Button */}
            <button
              onClick={handleApplyCustomDates}
              className="px-4 py-1.5 bg-[#e8b86d]/20 hover:bg-[#e8b86d] text-[#e8b86d] hover:text-[#1a1a2e] border border-[#e8b86d]/30 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Aplicar Rango
            </button>
          </div>
        </div>
      </div>

      {/* Error alert if API had issues */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Section 1: KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Ingresos Totales */}
            <StatCard
              title="Ingresos Totales"
              value={formatCOP(totalVentas)}
              subtitle={`${totalOrdenesAprobadas} transacciones aprobadas`}
              icon={DollarSign}
              accent="bg-[#e8b86d]/15 text-[#e8b86d]"
              badge={{
                text: 'Aprobado',
                color: 'bg-green-500/10 text-green-400 border-green-500/20',
              }}
            />

            {/* KPI 2: Total Órdenes Pagadas */}
            <StatCard
              title="Órdenes Pagadas"
              value={String(totalOrdenesAprobadas)}
              subtitle="Pagos completados con éxito"
              icon={ShoppingBag}
              accent="bg-blue-500/15 text-blue-400"
              badge={{
                text: `${data?.totalPedidosPeriodo ?? 0} totales`,
                color: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
              }}
            />

            {/* KPI 3: Ticket Promedio (AOV) */}
            <StatCard
              title="Ticket Promedio (AOV)"
              value={formatCOP(ticketPromedio)}
              subtitle="Promedio por orden aprobada"
              icon={TrendingUp}
              accent="bg-emerald-500/15 text-emerald-400"
            />

            {/* KPI 4: Alerta Despachos Pendientes */}
            <StatCard
              title="Pendientes por Despachar"
              value={String(pedidosPendientes)}
              subtitle="Órdenes pagadas sin guía / PENDING"
              icon={Truck}
              accent={pedidosPendientes > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-slate-500/10 text-slate-400'}
              isAlert={pedidosPendientes > 0}
              badge={
                pedidosPendientes > 0
                  ? { text: '¡Requiere Acción!', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                  : { text: 'Al Día', color: 'bg-green-500/10 text-green-400 border-green-500/20' }
              }
            />
          </div>

          {/* Section 2: Charts Row 1 - Evolución de Ventas & Embudo de Pagos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Gráfico 1: Evolución de Ventas Diarias */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#e8b86d]" />
                    Evolución de Ventas
                  </h2>
                  <span className="text-xs font-semibold text-[#e8b86d]">
                    {formatCOP(totalVentas)} COP
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Volumen de ingresos diarios en órdenes con pago aprobado
                </p>
              </div>

              <div className="h-[280px] w-full">
                {ventasDiarias.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No hay datos de ventas en este rango de fechas
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ventasDiarias} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="ventasGradientFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e8b86d" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#e8b86d" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="fecha"
                        tickFormatter={formatShortDay}
                        stroke="#475569"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        interval="preserveStartEnd"
                        tickCount={7}
                      />
                      <YAxis
                        stroke="#475569"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                        width={48}
                      />
                      <Tooltip content={<CustomTooltipVentas />} />
                      <Area
                        type="monotone"
                        dataKey="monto"
                        stroke="#e8b86d"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#ventasGradientFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Gráfico 2: Embudo / Estado de Transacciones */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                    Estado de Transacciones (Embudo)
                  </h2>
                  <span className="text-xs font-semibold text-slate-400">
                    {totalTransaccionesPeriodo} transacciones
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Proporción de pagos aprobados, pendientes, rechazados y anulados
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-[210px] w-[210px] shrink-0">
                  {totalTransaccionesPeriodo === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Sin transacciones
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={estadosPago.filter((e) => (e?.cantidad ?? 0) > 0)}
                          dataKey="cantidad"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {estadosPago
                            .filter((e) => (e?.cantidad ?? 0) > 0)
                            .map((entry) => (
                              <Cell
                                key={entry.estado}
                                fill={PAYMENT_COLORS[entry.estado] || '#64748b'}
                              />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltipDonut />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="space-y-2.5 flex-1 w-full">
                  {estadosPago.map((e) => {
                    const cant = e?.cantidad ?? 0;
                    const pct =
                      totalTransaccionesPeriodo > 0
                        ? ((cant / totalTransaccionesPeriodo) * 100).toFixed(1)
                        : '0';
                    return (
                      <div
                        key={e.estado}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/2 border border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: PAYMENT_COLORS[e.estado] || '#64748b' }}
                          />
                          <span className="text-xs font-medium text-slate-300">
                            {PAYMENT_LABELS[e.estado] || e.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{cant}</span>
                          <span className="text-[11px] text-slate-500 w-10 text-right font-mono">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Charts Row 2 - Aromas Más Vendidos & Destinos de Envío */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Gráfico 3: Aromas Más Vendidos */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#e8b86d]" />
                    Top Aromas Más Vendidos
                  </h2>
                  <span className="text-xs font-semibold text-slate-400">
                    {totalTopAromas} unidades
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Preferencia de fragancias en compras aprobadas del rango seleccionado
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="h-[210px] w-[210px] shrink-0">
                  {topAromas.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                      Sin datos de aromas
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={topAromas}
                          dataKey="cantidad"
                          nameKey="nombre"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {topAromas.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltipDonut />} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="space-y-2 flex-1 w-full max-h-[210px] overflow-y-auto pr-1">
                  {topAromas.map((item, idx) => {
                    const pct =
                      totalTopAromas > 0
                        ? (((item?.cantidad ?? 0) / totalTopAromas) * 100).toFixed(0)
                        : '0';
                    return (
                      <div
                        key={item.nombre}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white/2 border border-white/5"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                PIE_SERIES_COLORS[idx % PIE_SERIES_COLORS.length],
                            }}
                          />
                          <span className="text-xs font-medium text-slate-300 truncate" title={item.nombre}>
                            {item.nombre}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-bold text-white">
                            {item?.cantidad ?? 0} uds
                          </span>
                          <span className="text-[11px] text-slate-500 w-8 text-right font-mono">
                            {pct}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {topAromas.length === 0 && (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No hay productos vendidos con aroma en este periodo
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico 4: Destinos de Envío (Bogotá vs Sabana vs Otras) */}
            <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-purple-400" />
                    Destinos de Envío (Bogotá vs Sabana)
                  </h2>
                  <span className="text-xs font-semibold text-purple-400">
                    Logística Regional
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Distribución geográfica de pedidos entregados local y regionalmente
                </p>
              </div>

              {/* Zona Summary Pills */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {distribucionGeografica.map((g) => (
                  <div
                    key={g.zona}
                    className="p-2.5 rounded-xl bg-white/2 border border-white/5 flex flex-col"
                  >
                    <span className="text-[10px] text-slate-400 font-semibold uppercase truncate">
                      {g.zona}
                    </span>
                    <span className="text-base font-bold text-white">{g.cantidad}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{g.porcentaje}% del total</span>
                  </div>
                ))}
              </div>

              {/* Horizontal Bar Chart for Top Cities */}
              <div className="h-[180px] w-full">
                {despachosPorCiudad.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    Sin datos de destinos en este periodo
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={despachosPorCiudad}
                      layout="vertical"
                      margin={{ left: 5, right: 15, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} />
                      <YAxis
                        type="category"
                        dataKey="ciudad"
                        stroke="#475569"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        width={90}
                      />
                      <Tooltip content={<CustomTooltipBar />} />
                      <Bar
                        dataKey="cantidad"
                        fill="#e8b86d"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Recent Orders in the Selected Period */}
          <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold text-white">Pedidos Recientes del Periodo</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Órdenes registradas en el rango de fechas consultado
                </p>
              </div>
              <Link
                href="/admin/ordenes"
                className="flex items-center gap-1.5 text-xs font-semibold text-[#e8b86d] hover:text-[#d4a85a] transition-colors"
              >
                Ver todas las órdenes <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-white/5">
              {ultimosPedidos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                  <p className="text-xs">No hay pedidos registrados en este rango de fechas</p>
                </div>
              ) : (
                ultimosPedidos.map((p) => {
                  const config = estadoEnvioBadge[p?.estado_envio] ?? estadoEnvioBadge.PENDING;
                  const isApproved =
                    p?.estado_pago?.toUpperCase() === 'APPROVED' || p?.estado_pago?.toLowerCase() === 'pagado';
                  const nombreCliente = p?.cliente_nombre || 'Cliente';
                  const inicial = nombreCliente.charAt(0).toUpperCase();

                  return (
                    <div
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-white/2 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#e8b86d]/10 flex items-center justify-center text-[#e8b86d] text-sm font-bold shrink-0">
                          {inicial}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{nombreCliente}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-mono">
                            <span>ID: {p.id.slice(0, 8)}...</span>
                            <span>•</span>
                            <span>
                              {p?.creado_en
                                ? new Date(p.creado_en).toLocaleDateString('es-CO', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-auto">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                            isApproved
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}
                        >
                          {p?.estado_pago || 'PENDIENTE'}
                        </span>
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${config.color}`}
                        >
                          {config.label}
                        </span>
                        <span className="text-sm font-bold text-white min-w-[90px] text-right">
                          {formatCOP(p?.total_pagado ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
