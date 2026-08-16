'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import SafeImage from '@/components/SafeImage';
import ImageUpload from '@/components/ImageUpload';
import ProductVariationsManager, { VariacionItem } from '@/components/ProductVariationsManager';
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
  Layers,
} from 'lucide-react';

/* ─── Toast ─── */

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

/* ─── Types ─── */

type TipoProducto = 'VELA' | 'JABON';

export interface VariacionProductoData {
  id: string;
  nombre: string;
  imagen: string;
  precio: number | null;
  activo: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoProducto;
  aroma: string | null;
  material: string | null;
  dimensiones: string | null;
  precio: number;
  stock: number;
  esBajoPedido: boolean;
  url_imagen: string;
  imagenes: string[];
  activo: boolean;
  variaciones?: VariacionProductoData[];
}

interface ProductoForm {
  nombre: string;
  descripcion: string;
  tipo: TipoProducto;
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
  tipo: 'VELA',
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
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  // Dynamic Aromas & Materiales with API persistence
  const [aromas, setAromas] = useState<string[]>(DEFAULT_AROMAS);
  const [aromasFull, setAromasFull] = useState<Array<{ id: string; nombre: string }>>([]);
  const [materiales, setMateriales] = useState<string[]>(DEFAULT_MATERIALES);
  const [materialesFull, setMaterialesFull] = useState<Array<{ id: string; nombre: string }>>([]);

  const [gestionOpen, setGestionOpen] = useState(false);
  const [nuevoAromaText, setNuevoAromaText] = useState('');
  const [nuevoMaterialText, setNuevoMaterialText] = useState('');
  const [editingAromaIdx, setEditingAromaIdx] = useState<number | null>(null);
  const [editingAromaVal, setEditingAromaVal] = useState('');
  const [editingMaterialIdx, setEditingMaterialIdx] = useState<number | null>(null);
  const [editingMaterialVal, setEditingMaterialVal] = useState('');

  const fetchAromas = async () => {
    try {
      const res = await fetch('/api/admin/aromas');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setAromas(data.map((a: { nombre: string }) => a.nombre));
          setAromasFull(data);
        }
      }
    } catch (err) {
      console.error('Error fetching aromas:', err);
    }
  };

  const fetchMateriales = async () => {
    try {
      const res = await fetch('/api/admin/materiales');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMateriales(data.map((m: { nombre: string }) => m.nombre));
          setMaterialesFull(data);
        }
      }
    } catch (err) {
      console.error('Error fetching materiales:', err);
    }
  };

  useEffect(() => {
    fetchAromas();
    fetchMateriales();
  }, []);

  const handleAddAroma = async () => {
    const val = nuevoAromaText.trim();
    if (!val) return;
    try {
      const res = await fetch('/api/admin/aromas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: val }),
      });
      if (res.ok) {
        setNuevoAromaText('');
        fetchAromas();
        showToast('Aroma guardado en la BD');
      } else {
        setAromas((prev) => [...prev, val]);
        setNuevoAromaText('');
      }
    } catch {
      setAromas((prev) => [...prev, val]);
      setNuevoAromaText('');
    }
  };

  const handleEditAroma = async (idx: number) => {
    const val = editingAromaVal.trim();
    if (!val) return;
    const oldName = aromas[idx];
    const item = aromasFull.find((a) => a.nombre === oldName);
    if (item?.id) {
      await fetch(`/api/admin/aromas/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: val }),
      });
      fetchAromas();
    } else {
      setAromas((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
      });
    }
    setEditingAromaIdx(null);
    setEditingAromaVal('');
  };

  const handleDeleteAroma = async (idx: number) => {
    const oldName = aromas[idx];
    const item = aromasFull.find((a) => a.nombre === oldName);
    if (item?.id) {
      await fetch(`/api/admin/aromas/${item.id}`, { method: 'DELETE' });
      fetchAromas();
    } else {
      setAromas((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const handleAddMaterial = async () => {
    const val = nuevoMaterialText.trim();
    if (!val) return;
    try {
      const res = await fetch('/api/admin/materiales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: val }),
      });
      if (res.ok) {
        setNuevoMaterialText('');
        fetchMateriales();
        showToast('Material guardado en la BD');
      } else {
        setMateriales((prev) => [...prev, val]);
        setNuevoMaterialText('');
      }
    } catch {
      setMateriales((prev) => [...prev, val]);
      setNuevoMaterialText('');
    }
  };

  const handleEditMaterial = async (idx: number) => {
    const val = editingMaterialVal.trim();
    if (!val) return;
    const oldName = materiales[idx];
    const item = materialesFull.find((m) => m.nombre === oldName);
    if (item?.id) {
      await fetch(`/api/admin/materiales/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: val }),
      });
      fetchMateriales();
    } else {
      setMateriales((prev) => {
        const next = [...prev];
        next[idx] = val;
        return next;
      });
    }
    setEditingMaterialIdx(null);
    setEditingMaterialVal('');
  };

  const handleDeleteMaterial = async (idx: number) => {
    const oldName = materiales[idx];
    const item = materialesFull.find((m) => m.nombre === oldName);
    if (item?.id) {
      await fetch(`/api/admin/materiales/${item.id}`, { method: 'DELETE' });
      fetchMateriales();
    } else {
      setMateriales((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const [filtroActivo, setFiltroActivo] = useState<string>('');
  const [filtroAroma, setFiltroAroma] = useState('');
  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroBajoPedido, setFiltroBajoPedido] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductoForm>(EMPTY_FORM);
  const [variacionesModal, setVariacionesModal] = useState<VariacionItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Separated Image state for form:
  // 1. Existing Supabase URLs
  const [imagenesExistentes, setImagenesExistentes] = useState<[string, string, string]>(['', '', '']);
  // 2. Newly selected File objects
  const [imageFiles, setImageFiles] = useState<[File | null, File | null, File | null]>([null, null, null]);
  // 3. Previews (either Supabase URL or local blob ObjectURL)
  const [imagePreviews, setImagePreviews] = useState<[string, string, string]>(['', '', '']);
  // Track old image URLs to delete ONLY after successful save
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);

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
    if (filtroTipo) params.set('tipo', filtroTipo);
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
  }, [search, filtroActivo, filtroTipo, filtroAroma, filtroMaterial, filtroBajoPedido]);

  /* ─── Modal helpers ─── */

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setVariacionesModal([]);
    setImagenesExistentes(['', '', '']);
    setImageFiles([null, null, null]);
    setImagePreviews(['', '', '']);
    setPendingDeleteUrls([]);
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setEditingId(p.id);
    const imgs = p.imagenes ?? [];
    const existing: [string, string, string] = [
      imgs[0] || p.url_imagen || '',
      imgs[1] || '',
      imgs[2] || '',
    ];
    setForm({
      nombre: p.nombre,
      descripcion: p.descripcion,
      tipo: p.tipo || 'VELA',
      aroma: p.aroma ?? '',
      material: p.material ?? '',
      dimensiones: p.dimensiones ?? '',
      precio: p.precio ?? 0,
      stock: p.stock,
      activo: p.activo,
      esBajoPedido: p.esBajoPedido,
      imagenes: existing,
    });
    setVariacionesModal(
      (p.variaciones || []).map((v) => ({
        id: v.id,
        nombre: v.nombre || '',
        imagen: v.imagen || '',
        precio: v.precio !== null && v.precio !== undefined ? v.precio : null,
        activo: v.activo ?? true,
      }))
    );
    setImagenesExistentes(existing);
    setImageFiles([null, null, null]);
    setImagePreviews(existing);
    setPendingDeleteUrls([]);
    setModalOpen(true);
  };

  /* ─── Image handling (Local Previews + File Selection) ─── */

  const handleFileSelect = (slotIndex: number, file: File) => {
    // Generate immediate local preview using URL.createObjectURL
    const previewUrl = URL.createObjectURL(file);

    // If slot had an existing Supabase URL, mark it for pending cleanup on save
    const oldExistingUrl = imagenesExistentes[slotIndex];
    if (oldExistingUrl) {
      setPendingDeleteUrls((prev) => [...prev, oldExistingUrl]);
    }

    // Revoke old blob preview if any
    const oldPreview = imagePreviews[slotIndex];
    if (oldPreview && oldPreview.startsWith('blob:')) {
      URL.revokeObjectURL(oldPreview);
    }

    setImagenesExistentes((prev) => {
      const updated: [string, string, string] = [...prev];
      updated[slotIndex] = '';
      return updated;
    });

    setImageFiles((prev) => {
      const updated: [File | null, File | null, File | null] = [...prev];
      updated[slotIndex] = file;
      return updated;
    });

    setImagePreviews((prev) => {
      const updated: [string, string, string] = [...prev];
      updated[slotIndex] = previewUrl;
      return updated;
    });
  };

  const handleImageDelete = (slotIndex: number) => {
    const oldExistingUrl = imagenesExistentes[slotIndex];
    if (oldExistingUrl) {
      setPendingDeleteUrls((prev) => [...prev, oldExistingUrl]);
    }

    const oldPreview = imagePreviews[slotIndex];
    if (oldPreview && oldPreview.startsWith('blob:')) {
      URL.revokeObjectURL(oldPreview);
    }

    setImagenesExistentes((prev) => {
      const updated: [string, string, string] = [...prev];
      updated[slotIndex] = '';
      return updated;
    });

    setImageFiles((prev) => {
      const updated: [File | null, File | null, File | null] = [...prev];
      updated[slotIndex] = null;
      return updated;
    });

    setImagePreviews((prev) => {
      const updated: [string, string, string] = [...prev];
      updated[slotIndex] = '';
      return updated;
    });
  };

  /* ─── Save (Unified Upload + DB Save) ─── */

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imagePreviews[0]) {
      showToast('Debes seleccionar al menos la imagen principal.', 'error');
      return;
    }

    // Validar variaciones si no es bajo pedido
    if (!form.esBajoPedido && variacionesModal.length > 0) {
      const invalid = variacionesModal.find((v) => !v.nombre.trim() || !v.imagen.trim());
      if (invalid) {
        showToast('Cada variación debe tener obligatoriamente un Nombre y una Imagen.', 'error');
        return;
      }
    }

    setSaving(true);

    // Step 1: Upload new File objects to Supabase API FIRST
    const finalUrls: string[] = [];

    for (let i = 0; i < 3; i++) {
      const file = imageFiles[i];
      if (file) {
        try {
          const publicUrl = await uploadProductImage(file);
          if (!publicUrl) {
            throw new Error(`Error al subir la imagen ${i + 1}`);
          }
          finalUrls.push(publicUrl);
        } catch (err) {
          const msg = err instanceof Error ? err.message : `Error al subir la imagen ${i + 1}`;
          showToast(msg, 'error');
          setSaving(false);
          return; // STOP! Do not proceed to save product with broken/missing URLs
        }
      } else if (imagenesExistentes[i]) {
        finalUrls.push(imagenesExistentes[i]);
      }
    }

    const imagenesFinales = finalUrls.filter(Boolean);

    if (imagenesFinales.length === 0) {
      showToast('Debes seleccionar al menos la imagen principal.', 'error');
      setSaving(false);
      return;
    }

    const isJabon = form.tipo === 'JABON';

    const payload = {
      nombre: form.nombre,
      descripcion: form.descripcion,
      tipo: form.tipo,
      aroma: isJabon ? null : (form.aroma || null),
      material: isJabon ? null : (form.material || null),
      dimensiones: form.dimensiones ? form.dimensiones.trim() : null,
      precio: form.precio,
      stock: form.stock,
      url_imagen: imagenesFinales[0],
      imagenes: imagenesFinales,
      activo: form.activo,
      esBajoPedido: form.esBajoPedido,
      variaciones: form.esBajoPedido
        ? []
        : variacionesModal.map((v) => ({
            id: v.id && !v.id.startsWith('temp-') ? v.id : undefined,
            nombre: v.nombre.trim(),
            imagen: v.imagen.trim(),
            precio: v.precio !== null && v.precio !== undefined && v.precio !== '' ? parseFloat(String(v.precio)) : null,
            activo: v.activo,
          })),
    };

    try {
      const url = editingId ? `/api/productos/${editingId}` : '/api/productos';
      const method = editingId ? 'PUT' : 'POST';
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        showToast(editingId ? 'Producto actualizado correctamente' : 'Producto creado correctamente');

        // Cleanup local blob object URLs
        imagePreviews.forEach((prev) => {
          if (prev && prev.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
        });

        // Cleanup pending delete old Supabase URLs from Storage
        const urlsToDelete = pendingDeleteUrls.filter(
          (u) => u && !imagenesFinales.includes(u)
        );
        if (urlsToDelete.length > 0) {
          Promise.allSettled(
            urlsToDelete.map((u) => deleteProductImage(u))
          ).catch(() => {/* cleanup errors are non-critical */});
        }

        setPendingDeleteUrls([]);
        setModalOpen(false);
        fetchProductos();
      } else {
        const data = await r.json();
        showToast(data.error || 'Error al guardar producto', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al guardar producto', 'error');
    } finally {
      setSaving(false);
    }
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
                            <SafeImage src={p.url_imagen} alt={p.nombre} width={48} height={48} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.nombre}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {p.dimensiones && (
                              <p className="text-xs text-slate-500 line-clamp-1">{p.dimensiones}</p>
                            )}
                            {p.esBajoPedido && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                Bajo Pedido
                              </span>
                            )}
                            {!p.esBajoPedido && p.variaciones && p.variaciones.length > 0 && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#e8b86d]/15 text-[#e8b86d] border border-[#e8b86d]/30 flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {p.variaciones.length} {p.variaciones.length === 1 ? 'variación' : 'variaciones'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">{p.aroma}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{p.material ?? <span className="text-slate-600">—</span>}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#e8b86d]">
                      {p.precio !== null && p.precio !== undefined ? formatCOP(p.precio) : '—'}
                    </td>
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
                            <SafeImage src={img} alt={`img-${i}`} width={32} height={32} className="object-cover w-full h-full" fallbackIcon={ImageIcon} />
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
              {/* Tipo de producto selector */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-[#e8b86d] uppercase tracking-wider mb-2">
                  Tipo de Producto *
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                    <input
                      type="radio"
                      name="tipoProducto"
                      value="VELA"
                      checked={form.tipo === 'VELA'}
                      onChange={() => setForm((f) => ({ ...f, tipo: 'VELA' }))}
                      className="w-4 h-4 text-[#e8b86d] focus:ring-[#e8b86d] accent-[#e8b86d]"
                    />
                    <span>🕯️ Vela Artesanal</span>
                  </label>

                  <label className="flex items-center gap-2 text-sm font-medium text-white cursor-pointer">
                    <input
                      type="radio"
                      name="tipoProducto"
                      value="JABON"
                      checked={form.tipo === 'JABON'}
                      onChange={() => setForm((f) => ({ ...f, tipo: 'JABON' }))}
                      className="w-4 h-4 text-[#e8b86d] focus:ring-[#e8b86d] accent-[#e8b86d]"
                    />
                    <span>🧼 Jabón Artesanal</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Nombre del Producto *</label>
                  <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="ej: Vela Botánica Lavanda o Jabón de Avena & Miel"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>

                {/* Conditional Aroma & Material for VELA only */}
                {form.tipo === 'VELA' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Aroma Predeterminado *</label>
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
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Precio (COP) *</label>
                  <input required type="number" min={0} value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Stock Disponible *</label>
                  <input required type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Dimensiones / Peso</label>
                  <input
                    value={form.dimensiones}
                    onChange={(e) => setForm((f) => ({ ...f, dimensiones: e.target.value }))}
                    placeholder="ej: 8 cm x 7 cm o 120g / 6x6 cm"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                  />
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
                  {SLOT_LABELS.map((label, idx) => (
                    <ImageUpload
                      key={idx}
                      label={label}
                      imageUrl={imagePreviews[idx]}
                      isUploading={saving}
                      onUpload={(file) => handleFileSelect(idx, file)}
                      onDelete={imagePreviews[idx] ? () => handleImageDelete(idx) : undefined}
                      isPrimary={idx === 0}
                    />
                  ))}
                </div>
                {!imagePreviews[0] && (
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

              {/* ─── Gestor de Variaciones de Producto ─── */}
              <div className="pt-4 border-t border-white/10">
                <ProductVariationsManager
                  variaciones={variacionesModal}
                  onChange={setVariacionesModal}
                  basePrice={form.precio}
                  esBajoPedido={form.esBajoPedido}
                  disabled={saving}
                />
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
