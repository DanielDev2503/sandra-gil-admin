'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { uploadProductImage, deleteProductImage } from '@/lib/storage';
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
  Camera,
  ImageIcon,
  AlertCircle,
  Flame,
} from 'lucide-react';

/* ─── Toast ─── */

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/* ─── Types ─── */

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  aroma: string;
  material: string | null;
  dimensiones: string;
  precio: number;
  stock: number;
  esBajoPedido: boolean;
  url_imagen: string;
  imagenes: string[];
  activo: boolean;
}

interface ProductoForm {
  nombre: string;
  descripcion: string;
  aroma: string;
  material: string;
  dimensiones: string;
  precio: number;
  stock: number;
  activo: boolean;
  esBajoPedido: boolean;
  /** 3 slots fijos: [principal, secundaria1, secundaria2] */
  imagenes: [string, string, string];
}

const EMPTY_FORM: ProductoForm = {
  nombre: '',
  descripcion: '',
  aroma: '',
  material: '',
  dimensiones: '',
  precio: 0,
  stock: 0,
  activo: true,
  esBajoPedido: false,
  imagenes: ['', '', ''],
};

const SLOT_LABELS = ['Principal', 'Secundaria 1', 'Secundaria 2'] as const;

const DEFAULT_AROMAS = [
  'Lavanda & Manzanilla',
  'Cítricos & Caléndula',
  'Jazmín Imperial',
  'Rosas Silvestres',
  'Vainilla Dulce',
  'Canela & Manzana',
  'Eucalipto & Menta',
];

const DEFAULT_MATERIALES = [
  '100% Cera de Soya',
  'Cera de Abeja',
  'Mezcla Botánica',
  'Cera de Coco',
  'Flores Preservadas',
  'Cristales & Cuarzos',
];


export default function ProductosPage() {
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Dynamic Aromas & Materiales
  const [aromas, setAromas] = useState<string[]>(DEFAULT_AROMAS);
  const [materiales, setMateriales] = useState<string[]>(DEFAULT_MATERIALES);
  const [gestionOpen, setGestionOpen] = useState(false);
  const [nuevoAromaText, setNuevoAromaText] = useState('');
  const [nuevoMaterialText, setNuevoMaterialText] = useState('');
  const [editingAromaIdx, setEditingAromaIdx] = useState<number | null>(null);
  const [editingAromaVal, setEditingAromaVal] = useState('');
  const [editingMaterialIdx, setEditingMaterialIdx] = useState<number | null>(null);
  const [editingMaterialVal, setEditingMaterialVal] = useState('');

  const handleAddAroma = () => {
    const val = nuevoAromaText.trim();
    if (val && !aromas.includes(val)) {
      setAromas((prev) => [...prev, val]);
      setNuevoAromaText('');
    }
  };

  const handleEditAroma = (idx: number) => {
    const val = editingAromaVal.trim();
    if (val) {
      setAromas((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
      });
      setEditingAromaIdx(null);
      setEditingAromaVal('');
    }
  };

  const handleDeleteAroma = (idx: number) => {
    setAromas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddMaterial = () => {
    const val = nuevoMaterialText.trim();
    if (val && !materiales.includes(val)) {
      setMateriales((prev) => [...prev, val]);
      setNuevoMaterialText('');
    }
  };

  const handleEditMaterial = (idx: number) => {
    const val = editingMaterialVal.trim();
    if (val) {
      setMateriales((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
      });
      setEditingMaterialIdx(null);
      setEditingMaterialVal('');
    }
  };

  const handleDeleteMaterial = (idx: number) => {
    setMateriales((prev) => prev.filter((_, i) => i !== idx));
  };

  const [filtroActivo, setFiltroActivo] = useState<string>('');
  const [filtroAroma, setFiltroAroma] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroBajoPedido, setFiltroBajoPedido] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductoForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ─── Toast helpers ─── */

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  /* ─── Data fetching ─── */

  const fetchProductos = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filtroActivo !== '') params.set('activo', filtroActivo);
    if (filtroAroma) params.set('aroma', filtroAroma);
    if (filtroMaterial) params.set('material', filtroMaterial);
    if (filtroBajoPedido) params.set('esBajoPedido', 'true');
    const r = await fetch(`/api/productos?${params}`);
    const data = await r.json();
    setProductos(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filtroActivo, filtroAroma, filtroMaterial, filtroBajoPedido]);

  /* ─── Modal helpers ─── */

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditingId(p.id);
    const imgs = p.imagenes ?? [];
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      aroma: p.aroma,
      material: p.material ?? '',
      dimensiones: p.dimensiones,
      precio: p.precio,
      stock: p.stock,
      activo: p.activo,
      esBajoPedido: p.esBajoPedido,
      imagenes: [
        imgs[0] || p.url_imagen || '',
        imgs[1] || '',
        imgs[2] || '',
      ],
    });
    setModalOpen(true);
  };

  /* ─── Image handling ─── */

  const handleImageUpload = async (slotIndex: number, file: File) => {
    setUploadingSlot(slotIndex);
    try {
      const currentUrl = form.imagenes[slotIndex];
      if (currentUrl) {
        await deleteProductImage(currentUrl);
      }
      const publicUrl = await uploadProductImage(file);
      setForm((prev) => {
        const updated: [string, string, string] = [...prev.imagenes];
        updated[slotIndex] = publicUrl;
        return { ...prev, imagenes: updated };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploadingSlot(null);
      const ref = fileRefs[slotIndex];
      if (ref.current) ref.current.value = '';
    }
  };

  const handleImageDelete = async (slotIndex: number) => {
    const url = form.imagenes[slotIndex];
    if (url) {
      await deleteProductImage(url);
    }
    setForm((prev) => {
      const updated: [string, string, string] = [...prev.imagenes];
      updated[slotIndex] = '';
      return { ...prev, imagenes: updated };
    });
  };

  /* ─── Save ─── */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.imagenes[0]) {
      alert('Debes subir al menos la imagen principal.');
      return;
    }

    setSaving(true);

    const imagenesFinales = form.imagenes.filter((url) => url !== '');

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      aroma: form.aroma,
      material: form.material || null,
      dimensiones: form.dimensiones,
      precio: form.precio,
      stock: form.stock,
      activo: form.activo,
      esBajoPedido: form.esBajoPedido,
      url_imagen: imagenesFinales[0] ?? '',
      imagenes: imagenesFinales,
    };

    const url = editingId ? `/api/productos/${editingId}` : '/api/productos';
    const method = editingId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err?.error ?? 'Error al guardar el producto', 'error');
      return;
    }

    setModalOpen(false);
    showToast(
      editingId ? 'Producto actualizado con éxito' : 'Producto creado con éxito',
      'success'
    );
    fetchProductos();
  };

  /* ─── Delete product ─── */

  const handleDelete = async (id: string) => {
    await fetch(`/api/productos/${id}`, { method: 'DELETE' });
    setDeleteConfirm(null);
    fetchProductos();
  };

  /* ─── Formatting ─── */

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  /* ─── Render ─── */

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Productos</h1>
          <p className="text-slate-400 mt-1">{(productos?.length ?? 0)} productos encontrados</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setGestionOpen(true)}
            className="flex items-center gap-2 bg-[#1a1a2e] hover:bg-white/5 text-slate-300 border border-white/10 font-semibold px-4 py-3 rounded-xl transition-all duration-200 text-sm"
          >
            Gestionar Aromas y Materiales
          </button>
          <button
            id="btn-nuevo-producto"
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold px-5 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-[#e8b86d]/20"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
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
        <select
          value={filtroAroma}
          onChange={(e) => setFiltroAroma(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
        >
          <option value="">Todos los aromas</option>
          {aromas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filtroMaterial}
          onChange={(e) => setFiltroMaterial(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
        >
          <option value="">Todos los materiales</option>
          {materiales.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button
          onClick={() => setFiltroBajoPedido(!filtroBajoPedido)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
            filtroBajoPedido
              ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
              : 'bg-[#1a1a2e] text-slate-400 border-white/10 hover:border-white/20'
          }`}
        >
          <Flame className="w-4 h-4" />
          Bajo Pedido
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-[#e8b86d]" />
          </div>
        ) : (productos?.length ?? 0) === 0 ? (
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
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Imágenes</th>
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
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500 line-clamp-1">{p.dimensiones}</p>
                            {p.esBajoPedido && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                Bajo Pedido
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{p.aroma}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{p.material ?? <span className="text-slate-600">—</span>}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#e8b86d]">{formatCOP(p.precio)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${p.stock < 5 ? 'text-red-400' : 'text-white'}`}>
                        {p.stock}
                        {p.stock < 5 && <span className="ml-1 text-xs text-red-400">⚠</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        {(p.imagenes?.length ? p.imagenes : p.url_imagen ? [p.url_imagen] : []).map((img, i) => (
                          <div key={i} className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                            <Image src={img} alt={`img-${i}`} width={32} height={32} className="object-cover w-full h-full" />
                          </div>
                        ))}
                        {(!p.imagenes?.length && !p.url_imagen) && (
                          <span className="text-xs text-slate-600">Sin imágenes</span>
                        )}
                      </div>
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

      {/* ─── Create/Edit Modal ─── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-[#1a1a2e] z-10">
              <h2 className="text-xl font-bold text-white">
                {editingId ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
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
                  <select
                    required
                    value={form.aroma}
                    onChange={(e) => setForm((f) => ({ ...f, aroma: e.target.value }))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                  >
                    <option value="">Seleccionar aroma...</option>
                    {aromas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                    {form.aroma && !aromas.includes(form.aroma) && (
                      <option value={form.aroma}>{form.aroma}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Material</label>
                  <select
                    value={form.material}
                    onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                  >
                    <option value="">Seleccionar material...</option>
                    {materiales.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {form.material && !materiales.includes(form.material) && (
                      <option value={form.material}>{form.material}</option>
                    )}
                  </select>
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
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Dimensiones</label>
                  <input value={form.dimensiones} onChange={(e) => setForm((f) => ({ ...f, dimensiones: e.target.value }))}
                    placeholder="ej: 7cm diámetro x 10cm alto"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Descripción *</label>
                <textarea required rows={3} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-none" />
              </div>

              {/* ─── Image Slots ─── */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Imágenes <span className="text-slate-500 font-normal">(máx. 3 — la primera es la principal)</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {SLOT_LABELS.map((label, idx) => {
                    const imgUrl = form.imagenes[idx];
                    const isUploading = uploadingSlot === idx;

                    return (
                      <div key={idx} className="relative group">
                        <input
                          ref={fileRefs[idx]}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(idx, file);
                          }}
                        />

                        {imgUrl ? (
                          <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-white/5">
                            <Image src={imgUrl} alt={`${label}`} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileRefs[idx].current?.click()}
                                className="p-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-white transition-all backdrop-blur-sm"
                                title="Reemplazar imagen"
                              >
                                <Camera className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImageDelete(idx)}
                                className="p-2.5 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 transition-all backdrop-blur-sm"
                                title="Eliminar imagen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm ${
                              idx === 0
                                ? 'bg-[#e8b86d]/80 text-[#1a1a2e]'
                                : 'bg-white/20 text-white/80'
                            }`}>
                              {label}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileRefs[idx].current?.click()}
                            disabled={isUploading}
                            className={`aspect-square w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all duration-200 ${
                              idx === 0
                                ? 'border-[#e8b86d]/30 hover:border-[#e8b86d]/60 hover:bg-[#e8b86d]/5'
                                : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d]" />
                                <span className="text-xs text-slate-400">Subiendo...</span>
                              </>
                            ) : (
                              <>
                                {idx === 0 ? (
                                  <Camera className="w-6 h-6 text-[#e8b86d]/60" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-slate-600" />
                                )}
                                <span className={`text-xs font-medium ${
                                  idx === 0 ? 'text-[#e8b86d]/60' : 'text-slate-600'
                                }`}>
                                  {label}
                                </span>
                                <Upload className="w-3.5 h-3.5 text-slate-600" />
                              </>
                            )}
                          </button>
                        )}

                        {isUploading && imgUrl && (
                          <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {!form.imagenes[0] && (
                  <p className="text-xs text-amber-400/70 mt-2 flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    La imagen principal es obligatoria
                  </p>
                )}
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
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
                  <span className="text-sm text-slate-300">{form.activo ? 'Activo' : 'Inactivo'}</span>
                </div>

                {/* Bajo pedido toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, esBajoPedido: !f.esBajoPedido }))}
                    className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 ${form.esBajoPedido ? 'bg-orange-500' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${form.esBajoPedido ? 'translate-x-7' : 'translate-x-1'}`}
                    ></span>
                  </button>
                  <span className="text-sm text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    {form.esBajoPedido ? 'Bajo pedido' : 'Stock normal'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || uploadingSlot !== null}
                  className="flex items-center gap-2 px-6 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Gestionar Aromas y Materiales ─── */}
      {gestionOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
              <h2 className="text-xl font-bold text-white">Gestionar Aromas y Materiales</h2>
              <button onClick={() => setGestionOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aromas Section */}
              <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-md font-semibold text-[#e8b86d]">Aromas ({aromas.length})</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nuevo aroma..."
                    value={nuevoAromaText}
                    onChange={(e) => setNuevoAromaText(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#e8b86d]"
                  />
                  <button
                    type="button"
                    onClick={handleAddAroma}
                    className="px-3 py-2 bg-[#e8b86d] text-[#1a1a2e] font-semibold text-xs rounded-lg hover:bg-[#d4a85a]"
                  >
                    Agregar
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {aromas.map((aroma, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-sm text-white">
                      {editingAromaIdx === idx ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingAromaVal}
                            onChange={(e) => setEditingAromaVal(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditAroma(idx)}
                            className="text-xs text-green-400 font-semibold px-2 py-1 bg-green-500/10 rounded"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 text-slate-200">{aroma}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAromaIdx(idx);
                            setEditingAromaVal(aroma);
                          }}
                          className="p-1 text-slate-400 hover:text-[#e8b86d]"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAroma(idx)}
                          className="p-1 text-slate-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiales Section */}
              <div className="bg-white/3 border border-white/5 rounded-xl p-4 space-y-4">
                <h3 className="text-md font-semibold text-[#e8b86d]">Materiales ({materiales.length})</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nuevo material..."
                    value={nuevoMaterialText}
                    onChange={(e) => setNuevoMaterialText(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#e8b86d]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="px-3 py-2 bg-[#e8b86d] text-[#1a1a2e] font-semibold text-xs rounded-lg hover:bg-[#d4a85a]"
                  >
                    Agregar
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {materiales.map((mat, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-sm text-white">
                      {editingMaterialIdx === idx ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingMaterialVal}
                            onChange={(e) => setEditingMaterialVal(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/20 rounded px-2 py-1 text-xs text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleEditMaterial(idx)}
                            className="text-xs text-green-400 font-semibold px-2 py-1 bg-green-500/10 rounded"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <span className="flex-1 text-slate-200">{mat}</span>
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterialIdx(idx);
                            setEditingMaterialVal(mat);
                          }}
                          className="p-1 text-slate-400 hover:text-[#e8b86d]"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(idx)}
                          className="p-1 text-slate-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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

      {/* ─── Toast Container ─── */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border pointer-events-auto
              backdrop-blur-md text-sm font-medium min-w-[280px] max-w-sm
              transition-all duration-300 ease-out
              ${
                toast.type === 'success'
                  ? 'bg-[#0f2a1a]/90 border-green-500/30 text-green-300'
                  : 'bg-[#2a0f0f]/90 border-red-500/30 text-red-300'
              }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
