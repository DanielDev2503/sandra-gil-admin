'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  Save,
  Loader2,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  X,
  Thermometer,
  Cpu,
  MessageSquareText,
  ImageIcon,
} from 'lucide-react';

interface AIConfig {
  promptGenerador: string;
  promptImagen: string;
  temperatura: number;
  modelo: string;
}

type ToastType = 'success' | 'error';
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const MODELOS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
];

export default function ConfiguracionIAPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    fetch('/api/ai/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        showToast('Configuración guardada exitosamente', 'success');
      } else {
        showToast('Error al guardar la configuración', 'error');
      }
    } catch {
      showToast('Error de conexión', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    const res = await fetch('/api/ai/config');
    const data = await res.json();
    setConfig(data);
    setLoading(false);
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#e8b86d]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configuración IA</h1>
            <p className="text-slate-400 mt-0.5">Personaliza los prompts y parámetros de Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Recargar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 text-sm shadow-lg shadow-[#e8b86d]/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Modelo y Temperatura */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Modelo */}
          <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Cpu className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Modelo</h3>
                <p className="text-xs text-slate-500">Modelo de Gemini a utilizar</p>
              </div>
            </div>
            <select
              value={config.modelo}
              onChange={(e) => setConfig({ ...config, modelo: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all"
            >
              {MODELOS.map((m) => (
                <option key={m.value} value={m.value} className="bg-slate-800 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperatura */}
          <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Thermometer className="w-4.5 h-4.5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Temperatura</h3>
                <p className="text-xs text-slate-500">Creatividad de las respuestas</p>
              </div>
            </div>
            <div className="space-y-3">
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperatura}
                onChange={(e) =>
                  setConfig({ ...config, temperatura: parseFloat(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#e8b86d] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#e8b86d]/30
                  bg-gradient-to-r from-blue-500 via-[#e8b86d] to-red-500"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-400">Preciso (0)</span>
                <span className="text-lg font-bold text-[#e8b86d]">{config.temperatura.toFixed(1)}</span>
                <span className="text-red-400">Creativo (2)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Prompt Generador */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <MessageSquareText className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Prompt de Generación de Texto</h3>
              <p className="text-xs text-slate-500">
                Instrucciones para generar nombre, descripción, aroma y material del producto
              </p>
            </div>
          </div>
          <textarea
            rows={10}
            value={config.promptGenerador}
            onChange={(e) => setConfig({ ...config, promptGenerador: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-y"
            placeholder="Escribe las instrucciones para la generación de texto..."
          />
        </div>

        {/* Prompt Imagen */}
        <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <ImageIcon className="w-4.5 h-4.5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Prompt de Generación de Imagen</h3>
              <p className="text-xs text-slate-500">
                Estilo visual y dirección artística para las fotos generadas por IA
              </p>
            </div>
          </div>
          <textarea
            rows={6}
            value={config.promptImagen}
            onChange={(e) => setConfig({ ...config, promptImagen: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#e8b86d]/30 transition-all resize-y"
            placeholder="Escribe las instrucciones para el estilo de imagen..."
          />
        </div>
      </div>

      {/* Toast Container */}
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
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
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
