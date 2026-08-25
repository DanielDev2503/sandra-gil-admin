'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useMemo } from 'react';
import SafeImage from '@/components/SafeImage';
import {
  Filter,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Loader2,
  X,
  Truck,
  MapPin,
  MessageCircle,
  Calendar,
  CreditCard,
  AlertCircle,
  Search,
  Copy,
  Check,
  ShieldCheck,
  Wind,
  Layers,
  ImageIcon,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import { useToast } from '@/components/ToastContext';

interface ItemPedido {
  id: string;
  cantidad: number;
  precio_unitario: number;
  aroma?: string | null;
  variacion_id?: string | null;
  variacion_nombre?: string | null;
  variacion_imagen?: string | null;
  producto: { nombre: string; url_imagen: string; aroma?: string | null; material?: string | null };
}

interface Pedido {
  id: string;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono: string;
  ciudad: string;
  direccion_envio: string;
  total_pagado: number;
  estado_pago: string;
  estado_envio: string;
  id_transaccion_wompi?: string | null;
  numero_guia: string | null;
  transportadora?: string | null;
  referencia_wompi?: string | null;
  notas_admin: string | null;
  creado_en: string;
  items: ItemPedido[];
}

const ESTADOS_ENVIO = [
  { value: '', label: 'Todos los envíos', color: 'text-slate-300' },
  { value: 'PENDING', label: 'Pendiente (PENDING)', color: 'text-yellow-400' },
  { value: 'APPROVED', label: 'En Preparación (APPROVED)', color: 'text-blue-400' },
  { value: 'SHIPPED', label: 'Enviado / Despachado (SHIPPED)', color: 'text-purple-400' },
  { value: 'DELIVERED', label: 'Entregado (DELIVERED)', color: 'text-green-400' },
  { value: 'DECLINED', label: 'Cancelado (DECLINED)', color: 'text-red-400' },
];

const ESTADOS_PAGO = [
  { value: '', label: 'Todos los pagos' },
  { value: 'APPROVED', label: 'APPROVED / Pagado' },
  { value: 'PENDING', label: 'PENDING / Pendiente' },
  { value: 'DECLINED', label: 'DECLINED / Fallido' },
  { value: 'VOIDED', label: 'VOIDED / Anulado' },
];

const RANGOS_FECHA = [
  { value: '', label: 'Cualquier fecha' },
  { value: 'hoy', label: 'Hoy' },
  { value: '7dias', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Este mes' },
];

const CIUDADES = [
  { value: '', label: 'Todos los municipios' },
  { value: 'Bogotá', label: 'Bogotá D.C.' },
  { value: 'Chía', label: 'Chía' },
  { value: 'Cajicá', label: 'Cajicá' },
  { value: 'Cota', label: 'Cota' },
  { value: 'Zipaquirá', label: 'Zipaquirá' },
  { value: 'Sopó', label: 'Sopó' },
  { value: 'Tabio', label: 'Tabio' },
  { value: 'Tenjo', label: 'Tenjo' },
  { value: 'Tocancipá', label: 'Tocancipá' },
  { value: 'Madrid', label: 'Madrid' },
  { value: 'Mosquera', label: 'Mosquera' },
  { value: 'Funza', label: 'Funza' },
  { value: 'La Calera', label: 'La Calera' },
];

const estadoEnvioBadgeStyle: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pendiente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  aprobado: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  enviado: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
  entregado: 'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
  cancelado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const estadoPagoBadgeStyle: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pendiente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  pagado: 'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
  fallido: 'bg-red-500/10 text-red-400 border-red-500/20',
  rechazado: 'bg-red-500/10 text-red-400 border-red-500/20',
  VOIDED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  anulado: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

function formatCOP(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function formatOrderDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function normalizePaymentLabel(status?: string | null): string {
  if (!status) return 'PENDIENTE';
  const s = status.toUpperCase();
  if (s === 'APPROVED' || s === 'PAGADO') return 'APPROVED';
  if (s === 'DECLINED' || s === 'FALLIDO') return 'DECLINED';
  if (s === 'VOIDED' || s === 'ANULADO') return 'VOIDED';
  return 'PENDING';
}

function normalizeShippingLabel(status?: string | null): string {
  if (!status) return 'PENDING';
  const s = status.toUpperCase();
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'SHIPPED') return 'SHIPPED';
  if (s === 'DELIVERED') return 'DELIVERED';
  if (s === 'DECLINED') return 'DECLINED';
  return 'PENDING';
}

export default function OrdenesPage() {
  const toast = useToast();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search & Copy states
  const [busqueda, setBusqueda] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Advanced Filters
  const [filtroEstadoPago, setFiltroEstadoPago] = useState('');
  const [filtroEstadoEnvio, setFiltroEstadoEnvio] = useState('');
  const [filtroRangoFecha, setFiltroRangoFecha] = useState('');
  const [filtroCiudad, setFiltroCiudad] = useState('');

  // Modal / Drawer state for dispatch management
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [editEstado, setEditEstado] = useState('');
  const [editGuia, setEditGuia] = useState('');
  const [editTransportadora, setEditTransportadora] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCopy = (text: string, label = 'Dato') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    toast.success(`${label} copiado al portapapeles`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (busqueda.trim()) params.set('q', busqueda.trim());
      if (filtroEstadoEnvio) params.set('estado_envio', filtroEstadoEnvio);
      if (filtroEstadoPago) params.set('estado_pago', filtroEstadoPago);
      if (filtroCiudad) params.set('ciudad', filtroCiudad);

      if (filtroRangoFecha) {
        const now = new Date();
        if (filtroRangoFecha === 'hoy') {
          const todayStr = now.toISOString().slice(0, 10);
          params.set('from', todayStr);
          params.set('to', todayStr);
        } else if (filtroRangoFecha === '7dias') {
          const d = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
          params.set('from', d.toISOString().slice(0, 10));
          params.set('to', now.toISOString().slice(0, 10));
        } else if (filtroRangoFecha === 'mes') {
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          params.set('from', firstOfMonth.toISOString().slice(0, 10));
          params.set('to', now.toISOString().slice(0, 10));
        }
      }

      const r = await fetch(`/api/ordenes?${params.toString()}`);
      if (!r.ok) {
        throw new Error('No se pudieron cargar las órdenes');
      }
      const data = await r.json();
      setPedidos(data.pedidos ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      toast.error(err?.message || 'Error de conexión al cargar órdenes');
    } finally {
      setLoading(false);
    }
  }, [page, busqueda, filtroEstadoEnvio, filtroEstadoPago, filtroCiudad, filtroRangoFecha, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPedidos();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPedidos]);

  const openModal = (p: Pedido) => {
    setSelectedPedido(p);
    setEditEstado(p.estado_envio || 'PENDING');

    let initialCarrier = p.transportadora ?? '';
    let initialGuia = p.numero_guia ?? '';

    if (!initialCarrier && initialGuia.includes(' - ')) {
      const [carrierPart, ...codeParts] = initialGuia.split(' - ');
      initialCarrier = carrierPart.trim();
      initialGuia = codeParts.join(' - ').trim();
    }

    setEditTransportadora(initialCarrier);
    setEditGuia(initialGuia);
    setEditNotas(p.notas_admin ?? '');
  };

  const isSelectedPagoApproved = useMemo(() => {
    if (!selectedPedido) return false;
    const ep = selectedPedido.estado_pago?.toUpperCase();
    return ep === 'APPROVED' || ep === 'PAGADO';
  }, [selectedPedido]);

  const handleSaveOrden = async () => {
    if (!selectedPedido) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/ordenes/${selectedPedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_envio: editEstado,
          numero_guia: editGuia,
          transportadora: editTransportadora,
          notas_admin: editNotas,
        }),
      });

      if (res.ok) {
        toast.success('Pedido y datos de guía actualizados con éxito');
        setSelectedPedido(null);
        fetchPedidos();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al actualizar el pedido');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error de conexión al guardar el pedido');
    } finally {
      setSaving(false);
    }
  };

  // WhatsApp notification without emojis
  const handleWhatsApp = () => {
    if (!selectedPedido) return;
    const rawPhone = (selectedPedido.cliente_telefono || '').replace(/\D/g, '');
    const phoneFormatted = rawPhone.startsWith('57') ? rawPhone.slice(2) : rawPhone;
    const nombreCliente = selectedPedido.cliente_nombre || 'Cliente';
    const idTransaccion =
      selectedPedido.id_transaccion_wompi ||
      selectedPedido.referencia_wompi ||
      selectedPedido.id.slice(0, 8);
    const transportadora = editTransportadora || selectedPedido.transportadora || 'la transportadora';
    const numeroGuia = editGuia || selectedPedido.numero_guia || 'Pendiente';

    const messageText = `Hola ${nombreCliente}. Tu pedido de Sandra Gil - Velas con ID ${idTransaccion} ha sido despachado por la transportadora ${transportadora}. Tu número de guía es: ${numeroGuia}.`;

    const url = `https://wa.me/57${phoneFormatted}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            Gestión de Órdenes
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#e8b86d]/10 text-[#e8b86d] border border-[#e8b86d]/20">
              {total} Registros
            </span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Control de pagos, despachos, asignación de guías y notificación a clientes
          </p>
        </div>

        <button
          onClick={fetchPedidos}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-white/10 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#e8b86d]' : ''}`} />
          <span>Actualizar Lista</span>
        </button>
      </div>

      {/* Multicriteria Search Bar & Advanced Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#1a1a2e] border border-white/5 p-4 rounded-2xl shadow-xl">
        {/* Search input for Order ID, Wompi ID, Customer, Email, Phone */}
        <div className="flex-1 min-w-[260px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por ID Pedido, ID Wompi, cliente, guía, teléfono..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
          />
          {busqueda && (
            <button
              onClick={() => {
                setBusqueda('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter 1: Estado del Pago */}
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-slate-500" />
          <select
            value={filtroEstadoPago}
            onChange={(e) => {
              setFiltroEstadoPago(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all cursor-pointer"
          >
            {ESTADOS_PAGO.map((ep) => (
              <option key={ep.value} value={ep.value} className="bg-slate-800 text-white">
                {ep.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 2: Estado del Envío */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={filtroEstadoEnvio}
            onChange={(e) => {
              setFiltroEstadoEnvio(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all cursor-pointer"
          >
            {ESTADOS_ENVIO.map((ee) => (
              <option key={ee.value} value={ee.value} className="bg-slate-800 text-white">
                {ee.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 3: Rango de Fechas */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <select
            value={filtroRangoFecha}
            onChange={(e) => {
              setFiltroRangoFecha(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all cursor-pointer"
          >
            {RANGOS_FECHA.map((rf) => (
              <option key={rf.value} value={rf.value} className="bg-slate-800 text-white">
                {rf.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter 4: Ciudad */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-500" />
          <select
            value={filtroCiudad}
            onChange={(e) => {
              setFiltroCiudad(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all cursor-pointer"
          >
            {CIUDADES.map((c) => (
              <option key={c.value} value={c.value} className="bg-slate-800 text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Orders Table (Strict 9-Column Architecture) */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#e8b86d]" />
            <p className="text-xs text-slate-400">Cargando órdenes del sistema...</p>
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500">
            <ShoppingBag className="w-10 h-10 opacity-40" />
            <p className="text-sm font-medium">No se encontraron pedidos con los filtros aplicados</p>
            {(busqueda || filtroEstadoPago || filtroEstadoEnvio || filtroCiudad || filtroRangoFecha) && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroEstadoPago('');
                  setFiltroEstadoEnvio('');
                  setFiltroCiudad('');
                  setFiltroRangoFecha('');
                  setPage(1);
                }}
                className="text-xs text-[#e8b86d] hover:underline"
              >
                Limpiar todos los filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    {/* 1. Pago */}
                    <th className="px-5 py-4">1. Pago</th>
                    {/* 2. Envío */}
                    <th className="px-5 py-4">2. Envío</th>
                    {/* 3. Gestionar */}
                    <th className="px-5 py-4 text-center">3. Gestionar</th>
                    {/* 4. Cliente */}
                    <th className="px-5 py-4">4. Cliente</th>
                    {/* 5. Total */}
                    <th className="px-5 py-4">5. Total</th>
                    {/* 6. Guía */}
                    <th className="px-5 py-4">6. Guía</th>
                    {/* 7. Fecha */}
                    <th className="px-5 py-4">7. Fecha</th>
                    {/* 8. ID Pedido */}
                    <th className="px-5 py-4">8. ID Pedido</th>
                    {/* 9. ID Transacción Wompi */}
                    <th className="px-5 py-4">9. ID Transacción Wompi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {pedidos.map((p) => {
                    const isApproved =
                      p.estado_pago?.toUpperCase() === 'APPROVED' ||
                      p.estado_pago?.toLowerCase() === 'pagado';
                    const hasGuia = Boolean(p.numero_guia && p.numero_guia.trim().length > 0);
                    const sinGuiaAlert = isApproved && !hasGuia;
                    const wompiId = p.id_transaccion_wompi || p.referencia_wompi;

                    const normalizedPago = normalizePaymentLabel(p.estado_pago);
                    const normalizedEnvio = normalizeShippingLabel(p.estado_envio);

                    return (
                      <tr key={p.id} className="hover:bg-white/2 transition-colors">
                        {/* 1. Columna Pago */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              estadoPagoBadgeStyle[p.estado_pago] ||
                              'bg-white/5 text-slate-300 border-white/10'
                            }`}
                          >
                            {normalizedPago}
                          </span>
                        </td>

                        {/* 2. Columna Envío */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${
                              estadoEnvioBadgeStyle[p.estado_envio] ||
                              'bg-white/5 text-slate-300 border-white/10'
                            }`}
                          >
                            {normalizedEnvio}
                          </span>
                        </td>

                        {/* 3. Columna Gestionar */}
                        <td className="px-5 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => openModal(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#e8b86d] bg-[#e8b86d]/10 hover:bg-[#e8b86d] hover:text-[#1a1a2e] border border-[#e8b86d]/20 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                            title="Gestionar despacho y guía"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Gestionar</span>
                          </button>
                        </td>

                        {/* 4. Columna Cliente */}
                        <td className="px-5 py-4">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-white leading-tight">
                              {p.cliente_nombre || 'Cliente sin nombre'}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {p.cliente_telefono || 'Sin teléfono'}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate max-w-[150px]">{p.ciudad || 'Sin ciudad'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 5. Columna Total */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="text-sm font-bold text-[#e8b86d]">
                            {formatCOP(p.total_pagado)}
                          </span>
                        </td>

                        {/* 6. Columna Guía */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {hasGuia ? (
                            <div className="space-y-0.5">
                              {p.transportadora && (
                                <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                                  {p.transportadora}
                                </span>
                              )}
                              <span className="font-mono text-xs text-slate-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 inline-block">
                                {p.numero_guia}
                              </span>
                            </div>
                          ) : sinGuiaAlert ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 animate-pulse">
                              Sin Guía / Pendiente
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">—</span>
                          )}
                        </td>

                        {/* 7. Columna Fecha */}
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-300 font-medium">
                          {formatOrderDateTime(p.creado_en)}
                        </td>

                        {/* 8. Columna ID Pedido */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-white/5 px-2 py-1 rounded-md border border-white/10 w-fit">
                            <span className="truncate max-w-[90px] sm:max-w-[120px]" title={p.id}>
                              {p.id}
                            </span>
                            <button
                              onClick={() => handleCopy(p.id, 'ID Pedido')}
                              className="text-slate-400 hover:text-[#e8b86d] transition-colors p-0.5 cursor-pointer"
                              title="Copiar ID del Pedido"
                            >
                              {copiedText === p.id ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* 9. Columna ID Transacción Wompi */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {wompiId ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 w-fit">
                              <span className="truncate max-w-[100px] sm:max-w-[130px]" title={wompiId}>
                                {wompiId}
                              </span>
                              <button
                                onClick={() => handleCopy(wompiId, 'ID Transacción Wompi')}
                                className="text-blue-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                                title="Copiar ID Transacción Wompi"
                              >
                                {copiedText === wompiId ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                              Efectivo / Manual
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-white/5 gap-3">
                <p className="text-xs text-slate-400">
                  Mostrando página <span className="font-semibold text-white">{page}</span> de{' '}
                  <span className="font-semibold text-white">{totalPages}</span> ({total} pedidos en total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-xl transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal / Drawer para Gestión de Despacho y Notificación */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1a1a2e] z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#e8b86d]" />
                  Gestionar Despacho de Orden
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cliente: <strong className="text-white">{selectedPedido.cliente_nombre}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contenedor Destacado: IDs y Verificación */}
              <div className="bg-gradient-to-r from-[#e8b86d]/10 via-[#1a1a2e] to-blue-500/10 border border-[#e8b86d]/30 rounded-xl p-4 space-y-3 shadow-md">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <ShieldCheck className="w-5 h-5 text-[#e8b86d]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Datos Operativos / Verificación de Pago
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* ID Pedido */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-semibold block uppercase tracking-wider">
                      ID del Pedido (UUID)
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-white text-xs break-all select-all font-medium">
                        {selectedPedido.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedPedido.id, 'ID Pedido')}
                        className="p-1.5 bg-white/10 hover:bg-[#e8b86d] hover:text-[#1a1a2e] text-slate-300 rounded-md transition-all shrink-0 cursor-pointer"
                        title="Copiar ID del Pedido"
                      >
                        {copiedText === selectedPedido.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* ID Transacción Wompi */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-semibold block uppercase tracking-wider">
                      ID Transacción Wompi
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      {selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi ? (
                        <>
                          <span className="font-mono text-blue-300 text-xs break-all select-all font-semibold">
                            {selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                selectedPedido.id_transaccion_wompi ||
                                  selectedPedido.referencia_wompi ||
                                  '',
                                'ID Transacción Wompi'
                              )
                            }
                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500 hover:text-white text-blue-300 rounded-md transition-all shrink-0 cursor-pointer"
                            title="Copiar ID Transacción Wompi"
                          >
                            {copiedText ===
                            (selectedPedido.id_transaccion_wompi ||
                              selectedPedido.referencia_wompi) ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-wider">
                          Efectivo / Manual
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalle de Cliente y Dirección */}
              <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm border border-white/5">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Email</span>
                  <span className="text-slate-300 text-xs font-medium">{selectedPedido.cliente_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Teléfono</span>
                  <span className="text-slate-300 text-xs font-mono font-medium">
                    {selectedPedido.cliente_telefono}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Ciudad / Municipio</span>
                  <span className="text-slate-300 text-xs font-medium">{selectedPedido.ciudad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-xs">Dirección de Entrega</span>
                  <span className="text-slate-300 text-xs text-right max-w-[65%] font-medium">
                    {selectedPedido.direccion_envio}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5 items-center">
                  <span className="text-slate-400 text-xs font-semibold">Estado de Pago</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      isSelectedPagoApproved
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {selectedPedido.estado_pago}
                  </span>
                </div>
                <div className="flex justify-between pt-1 items-center">
                  <span className="text-slate-400 text-xs font-semibold">Total Pagado</span>
                  <span className="text-[#e8b86d] font-bold text-base">
                    {formatCOP(selectedPedido.total_pagado)}
                  </span>
                </div>
              </div>

              {/* Alerta si el pago NO está aprobado */}
              {!isSelectedPagoApproved && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Regla de negocio:</strong> El pago debe estar en estado{' '}
                    <strong>APPROVED</strong> para habilitar la asignación de transportadora, número de guía
                    y actualización del estado de envío a <strong>SHIPPED</strong> o{' '}
                    <strong>DELIVERED</strong>.
                  </span>
                </div>
              )}

              {/* Lista de Productos del Pedido */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#e8b86d]" />
                  Productos a Despachar
                </p>
                <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                  {(selectedPedido.items || []).map((item) => {
                    const itemImage = item.variacion_imagen || item.producto?.url_imagen;
                    return (
                      <div
                        key={item.id}
                        className="bg-white/3 border border-white/8 rounded-xl p-3 flex gap-3 items-center"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10 shrink-0 relative">
                          {itemImage ? (
                            <SafeImage
                              src={itemImage}
                              alt={item.variacion_nombre || item.producto?.nombre || 'Producto'}
                              width={48}
                              height={48}
                              className="object-cover w-full h-full"
                              fallbackIcon={ImageIcon}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {item.producto?.nombre || 'Producto sin nombre'}
                            </span>
                            <span className="text-xs font-bold text-[#e8b86d] shrink-0">
                              {formatCOP(item.cantidad * item.precio_unitario)}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {item.variacion_nombre && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                <Layers className="w-2.5 h-2.5 text-purple-400" />
                                {item.variacion_nombre}
                              </span>
                            )}
                            {item.aroma && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e8b86d]/15 text-[#e8b86d] border border-[#e8b86d]/30">
                                <Wind className="w-2.5 h-2.5 text-[#e8b86d]" />
                                {item.aroma}
                              </span>
                            )}
                            <span className="text-slate-400">
                              Cant: <strong>{item.cantidad}</strong> ({formatCOP(item.precio_unitario)} c/u)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formulario de Despacho */}
              <div className="space-y-4 pt-2 border-t border-white/5">
                {/* Transportadora */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Transportadora
                  </label>
                  <input
                    type="text"
                    disabled={!isSelectedPagoApproved}
                    value={editTransportadora}
                    onChange={(e) => setEditTransportadora(e.target.value)}
                    placeholder="ej: Servientrega, Envía, Interrapidísimo, TCC"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Número de guía */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Número de Guía
                  </label>
                  <input
                    type="text"
                    disabled={!isSelectedPagoApproved}
                    value={editGuia}
                    onChange={(e) => setEditGuia(e.target.value)}
                    placeholder="ej: TCC-1234567890"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Estado envío */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Estado de Envío
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!isSelectedPagoApproved && (val === 'SHIPPED' || val === 'DELIVERED')) {
                        alert('Solo puedes seleccionar SHIPPED o DELIVERED si el pago está en estado APPROVED.');
                        return;
                      }
                      setEditEstado(val);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all cursor-pointer"
                  >
                    {ESTADOS_ENVIO.filter((e) => e.value !== '').map((e) => {
                      const restricted = !isSelectedPagoApproved && (e.value === 'SHIPPED' || e.value === 'DELIVERED');
                      return (
                        <option
                          key={e.value}
                          value={e.value}
                          disabled={restricted}
                          className="bg-slate-800 text-white disabled:text-slate-600"
                        >
                          {e.label} {restricted ? '🔒 (Requiere APPROVED)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Notas admin */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Notas Internas
                  </label>
                  <textarea
                    rows={2}
                    value={editNotas}
                    onChange={(e) => setEditNotas(e.target.value)}
                    placeholder="Observaciones internas del empaque o despacho..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                {/* Botón WhatsApp sin emojis */}
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/20 font-semibold rounded-xl transition-all active:scale-95 text-xs cursor-pointer"
                  title="Notificar por WhatsApp sin emojis"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Notificar WhatsApp</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPedido(null)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOrden}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-xs cursor-pointer shadow-md"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
