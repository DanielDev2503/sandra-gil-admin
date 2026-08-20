'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import ProductVariationsManager, { VariacionItem } from '@/components/ProductVariationsManager';
import ImageUpload from '@/components/ImageUpload';
import { uploadProductImage } from '@/lib/storage';

import { useToast } from '@/components/ToastContext';

type TipoProducto = 'VELA' | 'JABON';

export default function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aromas, setAromas] = useState<string[]>([]);
  const [materiales, setMateriales] = useState<string[]>([]);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'VELA' as TipoProducto,
    aroma: '',
    material: '',
    dimensiones: '',
    precio: 0,
    stock: 0,
    activo: true,
    esBajoPedido: false,
    url_imagen: '',
  });

  const [variaciones, setVariaciones] = useState<VariacionItem[]>([]);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/aromas').then((r) => r.json()).catch(() => []),
      fetch('/api/admin/materiales').then((r) => r.json()).catch(() => []),
      fetch(`/api/productos/${id}`).then((r) => r.json()).catch(() => null),
    ]).then(([aromasData, materialesData, productoData]) => {
      if (Array.isArray(aromasData)) setAromas(aromasData.map((a: { nombre: string }) => a.nombre));
      if (Array.isArray(materialesData)) setMateriales(materialesData.map((m: { nombre: string }) => m.nombre));

      if (productoData && !productoData.error) {
        setForm({
          nombre: productoData.nombre ?? '',
          descripcion: productoData.descripcion ?? '',
          tipo: (productoData.tipo as TipoProducto) || 'VELA',
          aroma: productoData.aroma ?? '',
          material: productoData.material ?? '',
          dimensiones: productoData.dimensiones ?? '',
          precio: productoData.precio ?? 0,
          stock: productoData.stock ?? 0,
          activo: productoData.activo ?? true,
          esBajoPedido: productoData.esBajoPedido ?? false,
          url_imagen: productoData.url_imagen ?? (productoData.imagenes?.[0] || ''),
        });

        if (Array.isArray(productoData.variaciones)) {
          setVariaciones(
            productoData.variaciones.map((v: any) => ({
              id: v.id,
              nombre: v.nombre || '',
              imagen: v.imagen || '',
              precio: v.precio !== null && v.precio !== undefined ? v.precio : null,
              activo: v.activo ?? true,
            }))
          );
        }
      } else if (productoData?.error) {
        toast.error(productoData.error || 'No se pudo cargar el producto');
      }
      setLoading(false);
    });
  }, [id, toast]);

  const handleMainImageUpload = async (file: File) => {
    setUploadingMainImage(true);
    setErrorMessage(null);
    try {
      const publicUrl = await uploadProductImage(file);
      if (publicUrl) {
        setForm((f) => ({ ...f, url_imagen: publicUrl }));
        toast.success('Imagen principal actualizada');
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al subir la imagen principal';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setUploadingMainImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!form.url_imagen.trim()) {
      const msg = 'La imagen principal del producto es obligatoria.';
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    // Validar variaciones si no es bajo pedido
    if (!form.esBajoPedido && variaciones.length > 0) {
      const invalid = variaciones.find((v) => !v.nombre.trim() || !v.imagen.trim());
      if (invalid) {
        const msg = 'Cada variación debe tener obligatoriamente un Nombre y una Imagen asignada.';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);

    const isJabon = form.tipo === 'JABON';

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      tipo: form.tipo,
      aroma: isJabon ? null : (form.aroma || null),
      material: isJabon ? null : (form.material || null),
      dimensiones: form.dimensiones ? form.dimensiones.trim() : null,
      precio: form.precio,
      stock: form.stock,
      url_imagen: form.url_imagen.trim(),
      imagenes: form.url_imagen ? [form.url_imagen.trim()] : [],
      activo: form.activo,
      esBajoPedido: form.esBajoPedido,
      variaciones: form.esBajoPedido
        ? []
        : variaciones.map((v) => ({
            id: v.id && !v.id.startsWith('temp-') ? v.id : undefined,
            nombre: v.nombre.trim(),
            imagen: v.imagen.trim(),
            precio: v.precio !== null && v.precio !== undefined && v.precio !== '' ? parseFloat(String(v.precio)) : null,
            activo: v.activo,
          })),
    };

    try {
      const res = await fetch(`/api/productos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('¡Producto actualizado exitosamente!');
        router.push('/admin/productos');
        router.refresh();
      } else {
        const err = await res.json();
        const msg = err.error || 'Error al actualizar el producto';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'Error de conexión al actualizar el producto';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#e8b86d]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/productos"
          className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Editar Producto</h1>
          <p className="text-xs text-slate-400">Actualizar información y variaciones del producto en el catálogo</p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-sm text-red-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
        {/* Selector de Tipo de Producto */}
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-[#e8b86d] uppercase tracking-wider mb-2">
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
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="ej: Vela Botánica Lavanda o Jabón de Avena & Miel"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
            />
          </div>

          {/* Conditional Aroma & Material */}
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Precio Base (COP) *</label>
            <input
              required
              type="number"
              min={0}
              value={form.precio}
              onChange={(e) => setForm((f) => ({ ...f, precio: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stock Disponible *</label>
            <input
              required
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: parseInt(e.target.value, 10) || 0 }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
            />
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

          {/* Imagen Principal con Componente de Subida */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Imagen Principal del Producto *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <div className="max-w-[180px]">
                <ImageUpload
                  label="Principal *"
                  imageUrl={form.url_imagen}
                  isUploading={uploadingMainImage}
                  onUpload={handleMainImageUpload}
                  onDelete={form.url_imagen ? () => setForm((f) => ({ ...f, url_imagen: '' })) : undefined}
                  isPrimary={true}
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <p className="text-xs text-slate-400">
                  Sube la foto destacada del producto o actualiza la URL. Esta será la portada en el catálogo principal.
                </p>
                <input
                  value={form.url_imagen}
                  onChange={(e) => setForm((f) => ({ ...f, url_imagen: e.target.value }))}
                  placeholder="https://... o sube una imagen arriba"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Descripción *</label>
          <textarea
            required
            rows={4}
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-none"
          />
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-6 pt-2 pb-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, activo: !f.activo }))}
              className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 ${form.activo ? 'bg-[#e8b86d]' : 'bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${form.activo ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-slate-300">{form.activo ? 'Activo en Tienda' : 'Inactivo'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, esBajoPedido: !f.esBajoPedido }))}
              className={`relative inline-flex items-center w-12 h-6 rounded-full transition-colors duration-300 ${form.esBajoPedido ? 'bg-orange-500' : 'bg-gray-600'}`}
            >
              <span className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform duration-300 ${form.esBajoPedido ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Bajo Pedido
            </span>
          </div>
        </div>

        {/* ─── Gestor de Variaciones de Producto ─── */}
        <div className="pt-4 border-t border-white/10">
          <ProductVariationsManager
            variaciones={variaciones}
            onChange={setVariaciones}
            basePrice={form.precio}
            esBajoPedido={form.esBajoPedido}
            disabled={saving}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Link
            href="/admin/productos"
            className="px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm cursor-pointer"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
