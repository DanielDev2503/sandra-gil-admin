'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface ItemPedido {
  id: string;
  cantidad: number;
  precio_unitario: number;
  producto: { nombre: string; url_imagen: string };
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
  { value: 'SHIPPED', label: 'Enviado (SHIPPED)', color: 'text-purple-400' },
  { value: 'DELIVERED', label: 'Entregado (DELIVERED)', color: 'text-green-400' },
];

const ESTADOS_PAGO = [
  { value: '', label: 'Todos los pagos' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'DECLINED', label: 'DECLINED' },
  { value: 'VOIDED', label: 'VOIDED' },
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
];

const estadoBadge: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const estadoPagoBadge: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pendiente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED: 'bg-green-500/10 text-green-400 border-green-500/20',
  pagado: 'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
  fallido: 'bg-red-500/10 text-red-400 border-red-500/20',
  VOIDED: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function OrdenesPage() {
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

  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [editEstado, setEditEstado] = useState('');
  const [editGuia, setEditGuia] = useState('');
  const [editTransportadora, setEditTransportadora] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const fetchPedidos = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (busqueda.trim()) params.set('q', busqueda.trim());
    if (filtroEstadoEnvio) params.set('estado_envio', filtroEstadoEnvio);
    
    if (filtroEstadoPago) {
      const mappedPago = 
        filtroEstadoPago === 'APPROVED' ? 'pagado' :
        filtroEstadoPago === 'PENDING' ? 'pendiente' :
        filtroEstadoPago === 'DECLINED' ? 'fallido' :
        filtroEstadoPago === 'VOIDED' ? 'anulado' : filtroEstadoPago;
      params.set('estado_pago', mappedPago);
    }
    
    if (filtroCiudad) params.set('ciudad', filtroCiudad);
    const r = await fetch(`/api/ordenes?${params}`);
    const data = await r.json();
    setPedidos(data.pedidos ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPedidos();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroEstadoEnvio, filtroEstadoPago, filtroCiudad, page]);

  const openModal = (p: Pedido) => {
    setSelectedPedido(p);
    setEditEstado(p.estado_envio);
    setEditGuia(p.numero_guia ?? '');
    setEditTransportadora(p.transportadora ?? '');
    setEditNotas(p.notas_admin ?? '');
  };

  const handleSaveOrden = async () => {
    if (!selectedPedido) return;
    setSaving(true);
    await fetch(`/api/ordenes/${selectedPedido.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado_envio: editEstado,
        numero_guia: editGuia,
        transportadora: editTransportadora,
        notas_admin: editNotas,
      }),
    });
    setSaving(false);
    setSelectedPedido(null);
    fetchPedidos();
  };

  const handleWhatsApp = () => {
    if (!selectedPedido) return;
    const rawPhone = selectedPedido.cliente_telefono.replace(/\D/g, '');
    const phoneFormatted = rawPhone.startsWith('57') ? rawPhone.slice(2) : rawPhone;
    const nombreCliente = selectedPedido.cliente_nombre || '';
    const idTransaccion = selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi || selectedPedido.id;
    const transportadora = editTransportadora || selectedPedido.transportadora || 'la transportadora';
    const numeroGuia = editGuia || selectedPedido.numero_guia || '';

    const messageText = `Hola ${nombreCliente}. Tu pedido de Sandra Gil - Velas con ID ${idTransaccion} ha sido despachado por la transportadora ${transportadora}. Tu número de guía es: ${numeroGuia}.`;

    const url = `https://wa.me/57${phoneFormatted}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  // Client-side filtering logic
  const pedidosFiltrados = (pedidos ?? []).filter((p) => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchId = (p.id || '').toLowerCase().includes(q);
      const matchWompi = (p.id_transaccion_wompi || p.referencia_wompi || '').toLowerCase().includes(q);
      const matchNombre = (p.cliente_nombre || '').toLowerCase().includes(q);
      const matchEmail = (p.cliente_email || '').toLowerCase().includes(q);
      const matchTelefono = (p.cliente_telefono || '').toLowerCase().includes(q);
      if (!matchId && !matchWompi && !matchNombre && !matchEmail && !matchTelefono) {
        return false;
      }
    }
    if (filtroEstadoPago) {
      const epUpper = (p.estado_pago || '').toUpperCase();
      if (filtroEstadoPago === 'APPROVED' && epUpper !== 'APPROVED' && epUpper !== 'PAGADO') return false;
      if (filtroEstadoPago === 'PENDING' && epUpper !== 'PENDING' && epUpper !== 'PENDIENTE') return false;
      if (filtroEstadoPago === 'DECLINED' && epUpper !== 'DECLINED' && epUpper !== 'FALLIDO') return false;
      if (filtroEstadoPago === 'VOIDED' && epUpper !== 'VOIDED' && epUpper !== 'ANULADO') return false;
    }
    if (filtroEstadoEnvio && p.estado_envio !== filtroEstadoEnvio) {
      return false;
    }
    if (filtroRangoFecha) {
      const fecha = new Date(p.creado_en);
      const now = new Date();
      if (filtroRangoFecha === 'hoy') {
        if (fecha.toDateString() !== now.toDateString()) return false;
      } else if (filtroRangoFecha === '7dias') {
        const diffDays = (now.getTime() - fecha.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (filtroRangoFecha === 'mes') {
        if (fecha.getMonth() !== now.getMonth() || fecha.getFullYear() !== now.getFullYear()) return false;
      }
    }
    return true;
  });

  const isSelectedPagoApproved = selectedPedido
    ? (selectedPedido.estado_pago?.toUpperCase() === 'APPROVED' || selectedPedido.estado_pago?.toLowerCase() === 'pagado')
    : false;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Órdenes</h1>
          <p className="text-slate-400 mt-1">{total} pedidos registrados</p>
        </div>
      </div>

      {/* Advanced Filters & Multicriteria Search Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-[#1a1a2e] border border-white/5 p-4 rounded-2xl">
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
            placeholder="Buscar por ID Pedido, ID Wompi, cliente, email..."
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
            onChange={(e) => { setFiltroEstadoPago(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
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
            onChange={(e) => { setFiltroEstadoEnvio(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
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
            onChange={(e) => { setFiltroRangoFecha(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
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
            onChange={(e) => { setFiltroCiudad(e.target.value); setPage(1); }}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
          >
            {CIUDADES.map((c) => (
              <option key={c.value} value={c.value} className="bg-slate-800 text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-[#e8b86d]" />
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
            <ShoppingBag className="w-10 h-10" />
            <p>No hay pedidos que coincidan con la búsqueda o filtro</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Pedido</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID Transacción Wompi</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pago</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Envío</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guía</th>
                    <th className="px-5 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidosFiltrados.map((p) => {
                    const isApproved = p.estado_pago?.toUpperCase() === 'APPROVED' || p.estado_pago?.toLowerCase() === 'pagado';
                    const sinGuiaAlert = isApproved && !p.numero_guia && !(p as any).numeroGuia;
                    const wompiId = p.id_transaccion_wompi || p.referencia_wompi;

                    return (
                      <tr key={p.id} className="hover:bg-white/2 transition-colors">
                        {/* ID Pedido */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-white/5 px-2 py-1 rounded-md border border-white/10 w-fit">
                            <span className="truncate max-w-[90px] sm:max-w-[120px]" title={p.id}>
                              {p.id}
                            </span>
                            <button
                              onClick={() => handleCopy(p.id)}
                              className="text-slate-400 hover:text-[#e8b86d] transition-colors p-0.5"
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

                        {/* ID Transacción Wompi */}
                        <td className="px-5 py-4">
                          {wompiId ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20 w-fit">
                              <span className="truncate max-w-[100px] sm:max-w-[130px]" title={wompiId}>
                                {wompiId}
                              </span>
                              <button
                                onClick={() => handleCopy(wompiId)}
                                className="text-blue-400 hover:text-white transition-colors p-0.5"
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

                        {/* Cliente */}
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-white">{p.cliente_nombre}</p>
                          <p className="text-xs text-slate-500">{p.cliente_email}</p>
                          <p className="text-[11px] text-slate-500">{p.ciudad}</p>
                        </td>

                        {/* Fecha */}
                        <td className="px-5 py-4 text-xs text-slate-300 whitespace-nowrap">
                          {new Date(p.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        {/* Total */}
                        <td className="px-5 py-4 text-sm font-semibold text-[#e8b86d] whitespace-nowrap">{formatCOP(p.total_pagado)}</td>

                        {/* Pago */}
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoPagoBadge[p.estado_pago] ?? 'bg-white/5 text-slate-300 border-white/10'}`}>
                            {p.estado_pago}
                          </span>
                        </td>

                        {/* Envío */}
                        <td className="px-5 py-4">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoBadge[p.estado_envio] ?? ''}`}>
                            {ESTADOS_ENVIO.find((e) => e.value === p.estado_envio)?.label ?? p.estado_envio}
                          </span>
                        </td>

                        {/* Guía */}
                        <td className="px-5 py-4 text-sm text-slate-400">
                          {p.numero_guia ? (
                            <span className="font-mono text-xs">{p.numero_guia}</span>
                          ) : sinGuiaAlert ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500/20 text-red-400 border border-red-500/30">
                              Sin Guía
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <button
                            onClick={() => openModal(p)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-[#e8b86d] hover:bg-[#e8b86d]/10 rounded-lg transition-all"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                <p className="text-sm text-slate-500">
                  Página {page} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order management modal */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1a1a2e] z-10">
              <div>
                <h2 className="text-xl font-bold text-white">Gestionar Orden</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedPedido.cliente_nombre}</p>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Contenedor Destacado: Datos para Envío Express / Verificación de Pago */}
              <div className="bg-gradient-to-r from-[#e8b86d]/10 via-[#1a1a2e] to-blue-500/10 border border-[#e8b86d]/30 rounded-xl p-4 space-y-3 shadow-md">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <ShieldCheck className="w-5 h-5 text-[#e8b86d]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Datos para Envío Express / Verificación de Pago
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* ID Pedido */}
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[10px] font-semibold block uppercase tracking-wider">ID del Pedido (UUID)</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-white text-xs break-all select-all font-medium">{selectedPedido.id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedPedido.id)}
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
                    <span className="text-slate-400 text-[10px] font-semibold block uppercase tracking-wider">ID Transacción Wompi</span>
                    <div className="flex items-center justify-between gap-2">
                      {selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi ? (
                        <>
                          <span className="font-mono text-blue-300 text-xs break-all select-all font-semibold">
                            {selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi || '')}
                            className="p-1.5 bg-blue-500/20 hover:bg-blue-500 hover:text-white text-blue-300 rounded-md transition-all shrink-0 cursor-pointer"
                            title="Copiar ID Transacción Wompi"
                          >
                            {copiedText === (selectedPedido.id_transaccion_wompi || selectedPedido.referencia_wompi) ? (
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

              {/* Order info */}
              <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-300">{selectedPedido.cliente_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Teléfono</span>
                  <span className="text-slate-300">{selectedPedido.cliente_telefono}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ciudad</span>
                  <span className="text-slate-300">{selectedPedido.ciudad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dirección</span>
                  <span className="text-slate-300 text-right max-w-[60%]">{selectedPedido.direccion_envio}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400 font-medium">Estado Pago</span>
                  <span className={`font-semibold ${isSelectedPagoApproved ? 'text-green-400' : 'text-amber-400'}`}>
                    {selectedPedido.estado_pago}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-400 font-medium">Total</span>
                  <span className="text-[#e8b86d] font-semibold">{formatCOP(selectedPedido.total_pagado)}</span>
                </div>
              </div>

              {!isSelectedPagoApproved && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    El pago debe estar en estado <strong>APPROVED</strong> para habilitar transportadora, guía y cambios a SHIPPED/DELIVERED.
                  </span>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Productos</p>
                <div className="space-y-2">
                  {selectedPedido.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{item.producto.nombre}</span>
                      <span className="text-slate-500">x{item.cantidad} · {formatCOP(item.precio_unitario)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transportadora */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Transportadora</label>
                <input
                  type="text"
                  disabled={!isSelectedPagoApproved}
                  value={editTransportadora}
                  onChange={(e) => setEditTransportadora(e.target.value)}
                  placeholder="ej: Servientrega, Envía, Interrapidísimo"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              {/* Número de guía */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Número de guía</label>
                <input
                  type="text"
                  disabled={!isSelectedPagoApproved}
                  value={editGuia}
                  onChange={(e) => setEditGuia(e.target.value)}
                  placeholder="ej: TCC-1234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              {/* Estado envío */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estado de envío</label>
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                >
                  {ESTADOS_ENVIO.filter((e) => e.value !== '').map((e) => {
                    const restricted = !isSelectedPagoApproved && (e.value === 'SHIPPED' || e.value === 'DELIVERED');
                    return (
                      <option key={e.value} value={e.value} disabled={restricted} className="bg-slate-800 text-white disabled:text-slate-600">
                        {e.label} {restricted ? '🔒 (Requiere APPROVED)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Notas admin */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notas internas</label>
                <textarea
                  rows={3}
                  value={editNotas}
                  onChange={(e) => setEditNotas(e.target.value)}
                  placeholder="Observaciones internas del pedido..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                {/* WhatsApp button */}
                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="flex items-center gap-2 px-4 py-3 bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-600/20 font-semibold rounded-xl transition-all active:scale-95 text-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  Notificar WhatsApp
                </button>

                <div className="flex-1" />

                <button onClick={() => setSelectedPedido(null)}
                  className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleSaveOrden} disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm cursor-pointer">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


