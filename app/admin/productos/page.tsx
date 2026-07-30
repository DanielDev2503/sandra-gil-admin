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
  Sparkles,
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

const AROMAS = ['Lavanda', 'Cítricos', 'Rosas', 'Jazmín', 'Canela', 'Vainilla', 'Floral', 'Sándalo', 'Eucalipto'];
const MATERIALES = ['Cera de Soya', 'Cera de Abeja', 'Parafina', 'Blend Artesanal'];

/* ─── AI Types ─── */

interface AIResult {
  texto: { nombre: string; descripcion: string; aroma: string; material: string };
  imagenes: string[];
}

/* ─── Component ─── */

export default function ProductosPage() {
  const fileRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  // AI state
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [aiDraftPhoto, setAiDraftPhoto] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiSelectedImages, setAiSelectedImages] = useState<Set<number>>(new Set());
  const [aiPrimaryImage, setAiPrimaryImage] = useState<number | null>(null);
  const aiFileRef = useRef<HTMLInputElement>(null);

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
    setProductos(data);
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
    setAiPanelOpen(false);
    setAiResult(null);
    setAiDescription('');
    setAiDraftPhoto(null);
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
    setAiPanelOpen(false);
    setAiResult(null);
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

  /* ─── AI Generation ─── */

  const handleAiGenerate = async () => {
    if (!aiDescription.trim()) {
      showToast('Escribe una descripción para generar con IA', 'error');
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    setAiSelectedImages(new Set());
    setAiPrimaryImage(null);

    try {
      const res = await fetch('/api/ai/generate-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descripcion: aiDescription,
          foto: aiDraftPhoto,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err?.error ?? 'Error al generar con IA', 'error');
        setAiLoading(false);
        return;
      }

      const result: AIResult = await res.json();
      setAiResult(result);

      // Auto-select first image as primary
      if (result.imagenes.length > 0) {
        setAiPrimaryImage(0);
        const selected = new Set<number>();
        result.imagenes.forEach((_, i) => selected.add(i));
        setAiSelectedImages(selected);
      }
    } catch {
      showToast('Error de conexión al generar con IA', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiApply = () => {
    if (!aiResult) return;

    // Apply text
    setForm((prev) => ({
      ...prev,
      nombre: aiResult.texto.nombre || prev.nombre,
      descripcion: aiResult.texto.descripcion || prev.descripcion,
      aroma: aiResult.texto.aroma || prev.aroma,
      material: aiResult.texto.material || prev.material,
    }));

    // Apply images
    if (aiResult.imagenes.length > 0 && aiPrimaryImage !== null) {
      const primaryUrl = aiResult.imagenes[aiPrimaryImage];
      const secondaryUrls = aiResult.imagenes.filter(
        (_, i) => i !== aiPrimaryImage && aiSelectedImages.has(i)
      );

      setForm((prev) => ({
        ...prev,
        imagenes: [
          primaryUrl || prev.imagenes[0],
          secondaryUrls[0] || prev.imagenes[1],
          secondaryUrls[1] || prev.imagenes[2],
        ],
      }));
    }

    setAiPanelOpen(false);
    showToast('Contenido IA aplicado al formulario', 'success');
  };

  const handleAiDraftFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAiDraftPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
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
        <select
          value={filtroAroma}
          onChange={(e) => setFiltroAroma(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
        >
          <option value="">Todos los aromas</option>
          {AROMAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filtroMaterial}
          onChange={(e) => setFiltroMaterial(e.target.value)}
          className="bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
        >
          <option value="">Todos los materiales</option>
          {MATERIALES.map((m) => (
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
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setAiPanelOpen(!aiPanelOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      aiPanelOpen
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-300 border border-violet-500/20 hover:border-violet-500/40'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Generar con IA
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Panel */}
            {aiPanelOpen && (
              <div className="p-6 border-b border-violet-500/10 bg-gradient-to-b from-violet-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  <h3 className="text-sm font-bold text-violet-300">Generador IA (Gemini)</h3>
                </div>

                <div className="space-y-4">
                  {/* Draft photo upload */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Foto borrador <span className="text-slate-600">(opcional)</span>
                    </label>
                    <input
                      ref={aiFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAiDraftFile(file);
                      }}
                    />
                    {aiDraftPhoto ? (
                      <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                        <Image src={aiDraftPhoto} alt="Borrador" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setAiDraftPhoto(null)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => aiFileRef.current?.click()}
                        className="w-24 h-24 rounded-xl border-2 border-dashed border-violet-500/20 hover:border-violet-500/40 flex flex-col items-center justify-center gap-1 transition-all"
                      >
                        <Camera className="w-5 h-5 text-violet-400/60" />
                        <span className="text-[10px] text-slate-500">Subir foto</span>
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">
                      Descripción breve del producto *
                    </label>
                    <textarea
                      rows={2}
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="ej: vela artesanal aroma lavanda en vaso de vidrio reciclado, color morado pastel..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all resize-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiDescription.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm shadow-lg shadow-violet-500/20"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generando con Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generar
                      </>
                    )}
                  </button>

                  {/* AI Results */}
                  {aiResult && (
                    <div className="mt-4 space-y-4">
                      {/* Generated text preview */}
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-bold text-violet-400 uppercase tracking-wider">Texto generado</p>
                        <p className="text-sm text-white"><strong>Nombre:</strong> {aiResult.texto.nombre}</p>
                        <p className="text-xs text-slate-300 line-clamp-3"><strong>Descripción:</strong> {aiResult.texto.descripcion}</p>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>Aroma: <strong className="text-slate-200">{aiResult.texto.aroma}</strong></span>
                          <span>Material: <strong className="text-slate-200">{aiResult.texto.material}</strong></span>
                        </div>
                      </div>

                      {/* Generated images */}
                      {aiResult.imagenes.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-3">
                            Imágenes generadas — Clic para seleccionar principal
                          </p>
                          <div className="grid grid-cols-4 gap-3">
                            {aiResult.imagenes.map((url, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  setAiPrimaryImage(i);
                                  setAiSelectedImages((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(i) && i !== aiPrimaryImage) {
                                      next.delete(i);
                                    } else {
                                      next.add(i);
                                    }
                                    return next;
                                  });
                                }}
                                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                  aiPrimaryImage === i
                                    ? 'border-[#e8b86d] shadow-lg shadow-[#e8b86d]/20'
                                    : aiSelectedImages.has(i)
                                    ? 'border-violet-500/50'
                                    : 'border-white/10 hover:border-white/25'
                                }`}
                              >
                                <Image src={url} alt={`AI ${i + 1}`} fill className="object-cover" />
                                {aiPrimaryImage === i && (
                                  <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#e8b86d] text-[#1a1a2e]">
                                    Principal
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAiApply}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Aplicar al formulario
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  <label className="block text-sm font-medium text-slate-300 mb-2">Material</label>
                  <input value={form.material} onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                    placeholder="ej: Cera de Soya"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
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
                            <Image src={imgUrl} alt={`${label}`} fill className="object-cover" />
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
