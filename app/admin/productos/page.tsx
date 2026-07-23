'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  aroma: string;
  dimensiones: string;
  precio: number;
  stock: number;
  url_imagen: string;
  activo: boolean;
}

const EMPTY_FORM: Omit<Producto, 'id'> = {
  nombre: '',
  descripcion: '',
  aroma: '',
  dimensiones: '',
  precio: 0,
  stock: 0,
  url_imagen: '',
  activo: true,
};

export default function ProductosPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroActivo, setFiltroActivo] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Producto, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchProductos = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filtroActivo !== '') params.set('activo', filtroActivo);
    const r = await fetch(`/api/productos?${params}`);
    const data = await r.json();
    setProductos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtroActivo]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditingId(p.id);
    setForm({ nombre: p.nombre, descripcion: p.descripcion, aroma: p.aroma, dimensiones: p.dimensiones, precio: p.precio, stock: p.stock, url_imagen: p.url_imagen, activo: p.activo });
    setModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('productos').upload(path, file, { upsert: true });
    if (error) { alert('Error al subir imagen: ' + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from('productos').getPublicUrl(path);
    setForm((prev) => ({ ...prev, url_imagen: data.publicUrl }));
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editingId ? `/api/productos/${editingId}` : '/api/productos';
    const method = editingId ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    setModalOpen(false);
    fetchProductos();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    fetchProductos();
  };

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Productos</h1>
          <p className="text-slate-400 mt-1">{productos.length} productos encontrados</p>
        </div>
        <button
          id="btn-nuevo-producto"
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-[#e8b86d]/20"
        >
          <Plus className="w-5 h-5" />
          Nuevo Producto
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 focus:border-[#e8b86d]/30 transition-all"
          />
        </div>
        <select
          value={filtroActivo}
          onChange={(e) => setFiltroActivo(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-[#e8b86d]" />
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-500">
            <Package className="w-10 h-10" />
            <p>No hay productos que mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aroma</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                          {p.url_imagen ? (
                            <Image src={p.url_imagen} alt={p.nombre} width={48} height={48} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.nombre}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{p.dimensiones}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{p.aroma}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#e8b86d]">{formatCOP(p.precio)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${p.stock < 5 ? 'text-red-400' : 'text-white'}`}>
                        {p.stock}
                        {p.stock < 5 && <span className="ml-1 text-xs text-red-400">⚠</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.activo ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-green-400">
                          <CheckCircle className="w-3.5 h-3.5" /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                          <XCircle className="w-3.5 h-3.5" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 text-slate-400 hover:text-[#e8b86d] hover:bg-[#e8b86d]/10 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(p.id)}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1a1a2e]">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre *</label>
                  <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Aroma *</label>
                  <input required value={form.aroma} onChange={(e) => setForm((f) => ({ ...f, aroma: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Precio (COP) *</label>
                  <input required type="number" min={0} value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: parseFloat(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Stock *</label>
                  <input required type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value) }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Dimensiones</label>
                <input value={form.dimensiones} onChange={(e) => setForm((f) => ({ ...f, dimensiones: e.target.value }))}
                  placeholder="ej: 7cm diámetro x 10cm alto"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descripción *</label>
                <textarea required rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-none" />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Imagen</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:border-[#e8b86d]/30 hover:text-[#e8b86d] transition-all text-sm disabled:opacity-50">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                  </button>
                  {form.url_imagen && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10">
                      <Image src={form.url_imagen} alt="preview" width={56} height={56} className="object-cover w-full h-full" />
                    </div>
                  )}
                </div>
                {form.url_imagen && (
                  <p className="text-xs text-slate-500 mt-2 truncate">{form.url_imagen}</p>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
                  className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 ${form.activo ? 'bg-[#e8b86d]' : 'bg-gray-600'}`}
                >
                  <span
                    className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${form.activo ? 'translate-x-7' : 'translate-x-1'}`}
                  ></span>
                </button>
                <span className="text-sm text-slate-300">{form.activo ? 'Producto activo' : 'Producto inactivo'}</span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-slate-400 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
