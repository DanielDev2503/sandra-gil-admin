'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  ImageIcon,
  Camera,
  AlertTriangle,
  Sparkles,
  Layers,
  CheckCircle2,
  HelpCircle,
  Lock,
} from 'lucide-react';
import SafeImage from './SafeImage';
import { uploadProductImage } from '@/lib/storage';

export interface VariacionItem {
  id?: string;
  nombre: string;
  imagen: string;
  precio: number | string | null;
  activo: boolean;
  /** Internal tracking for client upload state */
  _uploading?: boolean;
}

interface ProductVariationsManagerProps {
  variaciones: VariacionItem[];
  onChange: (variaciones: VariacionItem[]) => void;
  basePrice?: number;
  esBajoPedido?: boolean;
  disabled?: boolean;
}

const formatCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);

export default function ProductVariationsManager({
  variaciones = [],
  onChange,
  basePrice = 0,
  esBajoPedido = false,
  disabled = false,
}: ProductVariationsManagerProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleAddVariation = () => {
    if (esBajoPedido || disabled) return;
    const newVar: VariacionItem = {
      id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nombre: '',
      imagen: '',
      precio: null,
      activo: true,
    };
    onChange([...variaciones, newVar]);
  };

  const handleUpdateVariation = (index: number, updates: Partial<VariacionItem>) => {
    const updated = variaciones.map((v, i) => (i === index ? { ...v, ...updates } : v));
    onChange(updated);
  };

  const handleRemoveVariation = (index: number) => {
    const updated = variaciones.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleFileUpload = async (index: number, file: File) => {
    setUploadError(null);
    handleUpdateVariation(index, { _uploading: true });

    try {
      const publicUrl = await uploadProductImage(file);
      if (publicUrl) {
        handleUpdateVariation(index, { imagen: publicUrl, _uploading: false });
      } else {
        throw new Error('No se recibió la URL de la imagen');
      }
    } catch (err: any) {
      console.error('Error subiendo imagen de variación:', err);
      setUploadError(err?.message || 'Error al subir la imagen');
      handleUpdateVariation(index, { _uploading: false });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#e8b86d]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Variaciones del Producto
            </h3>
            {variaciones.length > 0 && !esBajoPedido && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#e8b86d]/20 text-[#e8b86d] border border-[#e8b86d]/30">
                {variaciones.length} {variaciones.length === 1 ? 'variación' : 'variaciones'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Define presentaciones específicas (color, tamaño, acabado) con su propia imagen obligatoria.
          </p>
        </div>

        {!esBajoPedido && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddVariation}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#e8b86d]/15 hover:bg-[#e8b86d]/25 text-[#e8b86d] border border-[#e8b86d]/40 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Agregar Variación
          </button>
        )}
      </div>

      {uploadError && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Bloqueo estricto para productos Bajo Pedido */}
      {esBajoPedido ? (
        <div className="bg-orange-500/10 border border-orange-500/25 rounded-2xl p-5 text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-orange-500/20 text-orange-400 mb-1">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-orange-300">
            Variaciones Deshabilitadas para &quot;Bajo Pedido&quot;
          </h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Este producto está configurado como <strong>Bajo Pedido</strong>. Los pedidos personalizados se fabrican
            individualmente bajo solicitud del cliente y no admiten variantes fijas de inventario.
          </p>
        </div>
      ) : variaciones.length === 0 ? (
        /* Empty State */
        <div className="bg-white/3 border border-white/5 rounded-2xl p-6 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-white/5 text-slate-500">
            <Sparkles className="w-5 h-5 text-[#e8b86d]/60" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-300">Sin variaciones adicionales</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Si este producto no tiene opciones secundarias, se venderá como producto único con su imagen y precio principal.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddVariation}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#e8b86d]" />
            Agregar primera variación
          </button>
        </div>
      ) : (
        /* Variations List */
        <div className="space-y-3.5">
          {variaciones.map((v, idx) => (
            <div
              key={v.id || idx}
              className={`relative bg-gradient-to-r from-white/[0.04] to-white/[0.01] border ${
                !v.nombre.trim() || !v.imagen.trim()
                  ? 'border-amber-500/30'
                  : 'border-white/10'
              } rounded-2xl p-4 transition-all hover:border-[#e8b86d]/30`}
            >
              {/* Header row of variation card */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#e8b86d]/20 text-[#e8b86d] text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {v.nombre.trim() ? v.nombre : `Variación #${idx + 1}`}
                  </span>
                  {(!v.nombre.trim() || !v.imagen.trim()) && (
                    <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Incompleta (Nombre e Imagen requeridos)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Active toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.activo}
                      onChange={(e) => handleUpdateVariation(idx, { activo: e.target.checked })}
                      className="w-3.5 h-3.5 accent-[#e8b86d] rounded cursor-pointer"
                    />
                    <span className={v.activo ? 'text-green-400' : 'text-slate-500'}>
                      {v.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveVariation(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                    title="Eliminar variación"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* 1. Image Column (4 cols) */}
                <div className="sm:col-span-4 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Imagen de la Variación *
                  </label>
                  <div className="relative group aspect-square max-w-[160px] mx-auto sm:mx-0 w-full rounded-xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                    {v.imagen ? (
                      <>
                        <SafeImage
                          src={v.imagen}
                          alt={v.nombre || `Variación ${idx + 1}`}
                          fill
                          className="object-cover"
                          fallbackIcon={ImageIcon}
                        />
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <label className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white cursor-pointer transition-all">
                            <Camera className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(idx, f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleUpdateVariation(idx, { imagen: '' })}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-300 transition-all cursor-pointer"
                            title="Quitar imagen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-3 text-center hover:bg-white/5 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(idx, f);
                          }}
                        />
                        {v._uploading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d] mb-1" />
                            <span className="text-[11px] text-slate-400">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <div className="p-2.5 rounded-full bg-white/5 mb-1.5">
                              <Upload className="w-4 h-4 text-[#e8b86d]" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-300">
                              Subir foto
                            </span>
                            <span className="text-[9px] text-amber-400/80 mt-0.5">
                              Obligatoria *
                            </span>
                          </>
                        )}
                      </label>
                    )}

                    {v._uploading && v.imagen && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#e8b86d]" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Form fields (8 cols) */}
                <div className="sm:col-span-8 space-y-3">
                  {/* Nombre */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Nombre de la Variación *
                    </label>
                    <input
                      type="text"
                      required
                      value={v.nombre}
                      onChange={(e) => handleUpdateVariation(idx, { nombre: e.target.value })}
                      placeholder="ej: Tarro Ámbar 200g, Vela Blanca, Edición Navideña"
                      className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/40 transition-all"
                    />
                  </div>

                  {/* Precio */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Precio Específico (COP)
                      </label>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-[#e8b86d]" />
                        Opcional
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        value={v.precio !== null && v.precio !== undefined ? v.precio : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateVariation(idx, {
                            precio: val === '' ? null : parseFloat(val) || 0,
                          });
                        }}
                        placeholder={`Hereda precio base (${formatCOP(basePrice || 0)})`}
                        className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/40 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {v.precio !== null && v.precio !== undefined && v.precio !== '' ? (
                        <span className="text-green-400 font-medium">
                          ✓ Precio personalizado: {formatCOP(Number(v.precio))}
                        </span>
                      ) : (
                        <span className="text-slate-400">
                          ℹ️ Si está vacío, hereda el precio base del producto ({formatCOP(basePrice || 0)}).
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
