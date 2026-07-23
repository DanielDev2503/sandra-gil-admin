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
  numero_guia: string | null;
  notas_admin: string | null;
  creado_en: string;
  items: ItemPedido[];
}

const ESTADOS_ENVIO = [
  { value: '', label: 'Todos', color: 'text-slate-300' },
  { value: 'PENDING', label: 'Pendiente', color: 'text-yellow-400' },
  { value: 'APPROVED', label: 'Aprobado', color: 'text-blue-400' },
  { value: 'SHIPPED', label: 'Enviado', color: 'text-purple-400' },
  { value: 'DELIVERED', label: 'Entregado', color: 'text-green-400' },
  { value: 'DECLINED', label: 'Cancelado', color: 'text-red-400' },
];

const estadoBadge: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DELIVERED: 'bg-green-500/10 text-green-400 border-green-500/20',
  DECLINED: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const estadoPagoBadge: Record<string, string> = {
  pendiente: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  pagado: 'bg-green-500/10 text-green-400 border-green-500/20',
  fallido: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function OrdenesPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtroEstadoEnvio, setFiltroEstadoEnvio] = useState('');

  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [editEstado, setEditEstado] = useState('');
  const [editGuia, setEditGuia] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPedidos = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (filtroEstadoEnvio) params.set('estado_envio', filtroEstadoEnvio);
    const r = await fetch(`/api/ordenes?${params}`);
    const data = await r.json();
    setPedidos(data.pedidos ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  };

  useEffect(() => {
    fetchPedidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstadoEnvio, page]);

  const openModal = (p: Pedido) => {
    setSelectedPedido(p);
    setEditEstado(p.estado_envio);
    setEditGuia(p.numero_guia ?? '');
    setEditNotas(p.notas_admin ?? '');
  };

  const handleSaveOrden = async () => {
    if (!selectedPedido) return;
    setSaving(true);
    await fetch(`/api/ordenes/${selectedPedido.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_envio: editEstado, numero_guia: editGuia, notas_admin: editNotas }),
    });
    setSaving(false);
    setSelectedPedido(null);
    fetchPedidos();
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Órdenes</h1>
          <p className="text-slate-400 mt-1">{total} pedidos en total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-6 bg-[#1a1a2e] border border-white/5 p-1.5 rounded-xl w-fit flex-wrap">
        <Filter className="w-4 h-4 text-slate-500 ml-2 mr-1" />
        {ESTADOS_ENVIO.map((e) => (
          <button
            key={e.value}
            onClick={() => { setFiltroEstadoEnvio(e.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              filtroEstadoEnvio === e.value
                ? 'bg-[#e8b86d] text-[#1a1a2e]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-[#e8b86d]" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
            <ShoppingBag className="w-10 h-10" />
            <p>No hay pedidos con este filtro</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 text-left">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pago</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Envío</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Guía</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pedidos.map((p) => (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{p.cliente_nombre}</p>
                        <p className="text-xs text-slate-500">{p.ciudad}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {new Date(p.creado_en).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[#e8b86d]">{formatCOP(p.total_pagado)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoPagoBadge[p.estado_pago] ?? ''}`}>
                          {p.estado_pago}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoBadge[p.estado_envio] ?? ''}`}>
                          {ESTADOS_ENVIO.find((e) => e.value === p.estado_envio)?.label ?? p.estado_envio}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {p.numero_guia ?? <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openModal(p)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-[#e8b86d] hover:bg-[#e8b86d]/10 rounded-lg transition-all"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
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
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1a1a2e]">
              <div>
                <h2 className="text-xl font-bold text-white">Gestionar Orden</h2>
                <p className="text-xs text-slate-500 mt-1">{selectedPedido.cliente_nombre}</p>
              </div>
              <button onClick={() => setSelectedPedido(null)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
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
                  <span className="text-slate-400 font-medium">Total</span>
                  <span className="text-[#e8b86d] font-semibold">{formatCOP(selectedPedido.total_pagado)}</span>
                </div>
              </div>

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

              {/* Estado envío */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Estado de envío</label>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                >
                  {ESTADOS_ENVIO.filter((e) => e.value !== '').map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              {/* Número de guía */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Número de guía</label>
                <input
                  type="text"
                  value={editGuia}
                  onChange={(e) => setEditGuia(e.target.value)}
                  placeholder="ej: TCC-1234567890"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                />
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
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setSelectedPedido(null)}
                  className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  Cancelar
                </button>
                <button onClick={handleSaveOrden} disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm">
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
