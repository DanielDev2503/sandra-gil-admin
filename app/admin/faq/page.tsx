'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Eye,
  EyeOff,
  LayoutGrid,
  Table as TableIcon,
  Flame,
  ArrowUpDown,
  RefreshCw,
  Info,
  ChevronRight,
  MessageSquareQuote,
  Check,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';
import { CATEGORIAS_FAQ_PREDEFINIDAS } from '@/lib/validations/faq';

export interface FAQItem {
  id: string;
  pregunta: string;
  respuesta: string;
  categoria: string;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FAQFormState {
  pregunta: string;
  respuesta: string;
  categoria: string;
  orden: number;
  activo: boolean;
}

const EMPTY_FORM: FAQFormState = {
  pregunta: '',
  respuesta: '',
  categoria: 'General',
  orden: 0,
  activo: true,
};

// Map category to aesthetic badge styling
const getCategoryStyle = (categoria: string) => {
  const cat = categoria.toLowerCase().trim();
  if (cat.includes('general')) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-[#e8b86d]',
      border: 'border-amber-500/30',
      dot: 'bg-[#e8b86d]',
    };
  }
  if (cat.includes('cuidado') || cat.includes('vela')) {
    return {
      bg: 'bg-rose-500/10',
      text: 'text-rose-300',
      border: 'border-rose-500/30',
      dot: 'bg-rose-400',
    };
  }
  if (cat.includes('jabon') || cat.includes('jabón')) {
    return {
      bg: 'bg-purple-500/10',
      text: 'text-purple-300',
      border: 'border-purple-500/30',
      dot: 'bg-purple-400',
    };
  }
  if (cat.includes('envio') || cat.includes('entrega')) {
    return {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-300',
      border: 'border-emerald-500/30',
      dot: 'bg-emerald-400',
    };
  }
  if (cat.includes('pago') || cat.includes('pedido') || cat.includes('compra')) {
    return {
      bg: 'bg-sky-500/10',
      text: 'text-sky-300',
      border: 'border-sky-500/30',
      dot: 'bg-sky-400',
    };
  }
  if (cat.includes('personal') || cat.includes('mayor')) {
    return {
      bg: 'bg-orange-500/10',
      text: 'text-orange-300',
      border: 'border-orange-500/30',
      dot: 'bg-orange-400',
    };
  }
  return {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-300',
    border: 'border-indigo-500/30',
    dot: 'bg-indigo-400',
  };
};

const SUGGESTED_FAQS: Omit<FAQFormState, 'orden'>[] = [
  {
    pregunta: '¿De qué están hechas las velas de Sandra Gil?',
    respuesta:
      'Nuestras velas están elaboradas artesanalmente con 100% cera de soya vegetal de alta pureza, esencias aromáticas libres de ftalatos y pabilos de algodón ecológico, garantizando un quemado limpio y no tóxico.',
    categoria: 'General',
    activo: true,
  },
  {
    pregunta: '¿Cómo cuidar mi vela en el primer encendido?',
    respuesta:
      'En el primer encendido, deja la vela prendida entre 2 y 3 horas hasta que la cera derretida cubra toda la superficie de borde a borde. Esto evita el efecto túnel y maximiza la vida útil de tu vela.',
    categoria: 'Cuidado de Velas',
    activo: true,
  },
  {
    pregunta: '¿Cuánto tiempo tardan las entregas y a qué lugares envían?',
    respuesta:
      'Realizamos despachos a toda Colombia. En Bogotá y municipios de la Sabana (Chía, Cajicá, Cota, Zipaquirá) las entregas tardan de 1 a 2 días hábiles. Para otras ciudades principales de Colombia, el tiempo estimado es de 2 a 4 días hábiles.',
    categoria: 'Envíos y Entregas',
    activo: true,
  },
  {
    pregunta: '¿Qué medios de pago aceptan?',
    respuesta:
      'Aceptamos todos los métodos de pago a través de Wompi: tarjetas de crédito (Visa, Mastercard, Amex), cuentas de ahorro/corriente por PSE, Nequi y transferencias Bancolombia.',
    categoria: 'Pagos y Pedidos',
    activo: true,
  },
  {
    pregunta: '¿Realizan velas personalizadas para eventos o empresas?',
    respuesta:
      '¡Sí! Elaboramos velas personalizadas para bodas, bautizos, recordatorios, regalos corporativos y eventos especiales con etiquetas personalizadas y aromas a elección. Contáctanos por WhatsApp para cotizar.',
    categoria: 'Personalizados y Mayoristas',
    activo: true,
  },
];

export default function FAQAdminPage() {
  const { showToast } = useToast();

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [vistaModo, setVistaModo] = useState<'acordeon' | 'tabla'>('acordeon');

  // Expanded items in accordion view
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>({});

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [formState, setFormState] = useState<FAQFormState>(EMPTY_FORM);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [previewTab, setPreviewTab] = useState<'form' | 'preview'>('form');

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState<FAQItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch FAQs from API
  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/faq');
      if (!res.ok) throw new Error('Error al cargar preguntas');
      const data: FAQItem[] = await res.json();
      setFaqs(data);
    } catch (err: any) {
      console.error(err);
      showToast('Error al cargar el listado de preguntas frecuentes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  // Derived categories from existing FAQs + predefined ones
  const allCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_FAQ_PREDEFINIDAS);
    faqs.forEach((f) => {
      if (f.categoria && f.categoria.trim()) {
        set.add(f.categoria.trim());
      }
    });
    return Array.from(set);
  }, [faqs]);

  // Filtered FAQ list
  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesPregunta = faq.pregunta.toLowerCase().includes(query);
        const matchesRespuesta = faq.respuesta.toLowerCase().includes(query);
        const matchesCat = faq.categoria.toLowerCase().includes(query);
        if (!matchesPregunta && !matchesRespuesta && !matchesCat) return false;
      }

      // Category filter
      if (categoriaFiltro !== 'TODAS') {
        if (faq.categoria.toLowerCase() !== categoriaFiltro.toLowerCase()) return false;
      }

      // Status filter
      if (estadoFiltro === 'ACTIVAS' && !faq.activo) return false;
      if (estadoFiltro === 'INACTIVAS' && faq.activo) return false;

      return true;
    });
  }, [faqs, search, categoriaFiltro, estadoFiltro]);

  // Statistics
  const stats = useMemo(() => {
    const total = faqs.length;
    const activas = faqs.filter((f) => f.activo).length;
    const inactivas = total - activas;
    const categorias = new Set(faqs.map((f) => f.categoria.trim())).size;
    return { total, activas, inactivas, categorias };
  }, [faqs]);

  // Toggle item expanded state in Accordion view
  const toggleExpand = (id: string) => {
    setExpandedFaqs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle FAQ active state inline
  const handleToggleActivo = async (faq: FAQItem) => {
    const newActivo = !faq.activo;

    // Optimistic UI update
    setFaqs((prev) =>
      prev.map((item) => (item.id === faq.id ? { ...item, activo: newActivo } : item))
    );

    try {
      const res = await fetch(`/api/admin/faq/${faq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: newActivo }),
      });

      if (!res.ok) throw new Error('Error al actualizar estado');
      showToast(
        newActivo ? 'Pregunta activada (visible en tienda)' : 'Pregunta desactivada (oculta)',
        'info'
      );
    } catch (err: any) {
      console.error(err);
      // Rollback on error
      setFaqs((prev) =>
        prev.map((item) => (item.id === faq.id ? { ...item, activo: faq.activo } : item))
      );
      showToast('No se pudo cambiar el estado de la pregunta', 'error');
    }
  };

  // Open Create modal
  const handleOpenCreate = () => {
    const maxOrder = faqs.reduce((max, f) => (f.orden > max ? f.orden : max), -1);
    setEditingFaq(null);
    setFormState({
      ...EMPTY_FORM,
      orden: maxOrder + 1,
    });
    setCustomCategoryInput('');
    setFormErrors({});
    setPreviewTab('form');
    setModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (faq: FAQItem) => {
    setEditingFaq(faq);
    setFormState({
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      categoria: faq.categoria,
      orden: faq.orden,
      activo: faq.activo,
    });
    setCustomCategoryInput('');
    setFormErrors({});
    setPreviewTab('form');
    setModalOpen(true);
  };

  // Save (Create or Update) FAQ
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, string> = {};
    if (!formState.pregunta.trim() || formState.pregunta.trim().length < 3) {
      errors.pregunta = 'La pregunta debe tener al menos 3 caracteres.';
    }
    if (!formState.respuesta.trim() || formState.respuesta.trim().length < 5) {
      errors.respuesta = 'La respuesta debe tener al menos 5 caracteres.';
    }

    const finalCategory = customCategoryInput.trim()
      ? customCategoryInput.trim()
      : formState.categoria.trim() || 'General';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Por favor revisa los campos requeridos', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        pregunta: formState.pregunta.trim(),
        respuesta: formState.respuesta.trim(),
        categoria: finalCategory,
        orden: Number(formState.orden) || 0,
        activo: Boolean(formState.activo),
      };

      if (editingFaq) {
        // Update
        const res = await fetch(`/api/admin/faq/${editingFaq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al actualizar');
        }

        const updated: FAQItem = await res.json();
        setFaqs((prev) =>
          prev
            .map((item) => (item.id === updated.id ? updated : item))
            .sort((a, b) => a.orden - b.orden)
        );
        showToast('Pregunta frecuente actualizada exitosamente', 'success');
      } else {
        // Create
        const res = await fetch('/api/admin/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Error al crear');
        }

        const created: FAQItem = await res.json();
        setFaqs((prev) => [...prev, created].sort((a, b) => a.orden - b.orden));
        showToast('Nueva pregunta frecuente creada con éxito', 'success');
      }

      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Ocurrió un error al guardar la pregunta', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete modal open
  const handleOpenDelete = (faq: FAQItem) => {
    setFaqToDelete(faq);
    setDeleteModalOpen(true);
  };

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!faqToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/faq/${faqToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      setFaqs((prev) => prev.filter((f) => f.id !== faqToDelete.id));
      showToast('Pregunta frecuente eliminada correctamente', 'success');
      setDeleteModalOpen(false);
      setFaqToDelete(null);
    } catch (err: any) {
      console.error(err);
      showToast('Error al eliminar la pregunta', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Move FAQ item Up or Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filteredFaqs.length) return;

    const currentItem = filteredFaqs[index];
    const targetItem = filteredFaqs[targetIndex];

    // Swap their order numbers
    const newCurrentOrder = targetItem.orden;
    const newTargetOrder = currentItem.orden === targetItem.orden
      ? (direction === 'up' ? targetItem.orden + 1 : targetItem.orden - 1)
      : currentItem.orden;

    const updatedFaqs = faqs.map((f) => {
      if (f.id === currentItem.id) return { ...f, orden: newCurrentOrder };
      if (f.id === targetItem.id) return { ...f, orden: newTargetOrder };
      return f;
    }).sort((a, b) => a.orden - b.orden);

    // Optimistic UI update
    setFaqs(updatedFaqs);

    try {
      setReordering(true);
      const res = await fetch('/api/admin/faq/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: currentItem.id, orden: newCurrentOrder },
            { id: targetItem.id, orden: newTargetOrder },
          ],
        }),
      });

      if (!res.ok) throw new Error('Error al reordenar');
      showToast('Orden actualizado', 'info', 2000);
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el nuevo orden', 'error');
      fetchFaqs(); // reload on error
    } finally {
      setReordering(false);
    }
  };

  // Seed sample FAQs if none exist
  const handleSeedDefaults = async () => {
    try {
      setSaving(true);
      showToast('Cargando preguntas frecuentes sugeridas...', 'info');

      for (let i = 0; i < SUGGESTED_FAQS.length; i++) {
        const item = SUGGESTED_FAQS[i];
        await fetch('/api/admin/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...item,
            orden: i + 1,
          }),
        });
      }

      await fetchFaqs();
      showToast('¡Preguntas sugeridas cargadas con éxito!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Error al cargar preguntas de ejemplo', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1a2e] p-6 rounded-2xl border border-white/5 shadow-xl shadow-black/20">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b86d] to-[#c49a3c] flex items-center justify-center shadow-lg shadow-[#e8b86d]/20 shrink-0">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Preguntas Frecuentes (FAQ)
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Gestiona las dudas y respuestas que se exhiben en la tienda web para los clientes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchFaqs}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer flex items-center gap-2 text-sm disabled:opacity-50"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#e8b86d]' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <button
            id="btn-nueva-faq"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#e8b86d] to-[#c49a3c] hover:from-[#f0c47d] hover:to-[#d4a849] text-black font-semibold text-sm flex items-center gap-2 shadow-lg shadow-[#e8b86d]/20 hover:shadow-[#e8b86d]/30 transition-all duration-200 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Pregunta</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#1a1a2e] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Total de Preguntas</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300">
            <MessageSquareQuote className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1a1a2e] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-emerald-400 font-medium">Activas en Tienda</p>
            <p className="text-2xl font-bold text-emerald-300">{stats.activas}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1a1a2e] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">Inactivas / Ocultas</p>
            <p className="text-2xl font-bold text-slate-300">{stats.inactivas}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#1a1a2e] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-[#e8b86d] font-medium">Categorías</p>
            <p className="text-2xl font-bold text-[#e8b86d]">{stats.categorias}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#e8b86d]/10 flex items-center justify-center text-[#e8b86d] border border-[#e8b86d]/20">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filters toolbar */}
      <div className="bg-[#1a1a2e] p-4 rounded-2xl border border-white/5 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pregunta, respuesta o categoría..."
              className="w-full pl-10 pr-9 py-2.5 bg-black/30 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e8b86d]/60 focus:ring-1 focus:ring-[#e8b86d]/50 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Controls: Status & View Toggle */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Status select */}
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="px-3 py-2.5 bg-black/30 border border-white/10 rounded-xl text-xs sm:text-sm text-slate-300 focus:outline-none focus:border-[#e8b86d]/60 cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVAS">Solo Activas</option>
              <option value="INACTIVAS">Solo Inactivas</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setVistaModo('acordeon')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  vistaModo === 'acordeon'
                    ? 'bg-[#e8b86d] text-black shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista de Tarjetas / Acordeón"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                onClick={() => setVistaModo('tabla')}
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  vistaModo === 'tabla'
                    ? 'bg-[#e8b86d] text-black shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Compacta de Tabla"
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Tabla</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin scrollbar-thumb-white/10">
          <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#e8b86d]" />
            Categoría:
          </span>

          <button
            onClick={() => setCategoriaFiltro('TODAS')}
            className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all border cursor-pointer ${
              categoriaFiltro === 'TODAS'
                ? 'bg-[#e8b86d]/15 text-[#e8b86d] border-[#e8b86d]/40 shadow-sm'
                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
            }`}
          >
            Todas ({faqs.length})
          </button>

          {allCategories.map((cat) => {
            const count = faqs.filter(
              (f) => f.categoria.toLowerCase() === cat.toLowerCase()
            ).length;
            const isSelected = categoriaFiltro.toLowerCase() === cat.toLowerCase();
            const catStyle = getCategoryStyle(cat);

            return (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(isSelected ? 'TODAS' : cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all border flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? `${catStyle.bg} ${catStyle.text} ${catStyle.border} shadow-sm ring-1 ring-[#e8b86d]/30`
                    : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                <span>{cat}</span>
                <span className="text-[10px] opacity-70 bg-black/30 px-1.5 py-0.2 rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        // Skeleton loader
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-[#1a1a2e] p-5 rounded-2xl border border-white/5 animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-5 bg-white/10 rounded w-3/4" />
              </div>
              <div className="h-8 bg-white/10 rounded w-20 ml-4" />
            </div>
          ))}
        </div>
      ) : filteredFaqs.length === 0 ? (
        // Empty state
        <div className="bg-[#1a1a2e] p-10 rounded-2xl border border-white/5 text-center space-y-4 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#e8b86d] flex items-center justify-center mx-auto shadow-inner">
            <HelpCircle className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">
              {faqs.length === 0
                ? 'No hay preguntas frecuentes configuradas'
                : 'No se encontraron preguntas con los filtros seleccionados'}
            </h3>
            <p className="text-sm text-slate-400">
              {faqs.length === 0
                ? 'Comienza creando la primera pregunta frecuente o carga un set inicial sugerido para tiendas de velas y jabones.'
                : 'Prueba cambiando o limpiando los filtros de búsqueda o categoría.'}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {faqs.length === 0 ? (
              <>
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 rounded-xl bg-[#e8b86d] text-black font-semibold text-sm hover:bg-[#d4a849] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear Primera Pregunta
                </button>
                <button
                  onClick={handleSeedDefaults}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 border border-white/10"
                >
                  <Sparkles className="w-4 h-4 text-[#e8b86d]" />
                  Cargar Preguntas Sugeridas
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setSearch('');
                  setCategoriaFiltro('TODAS');
                  setEstadoFiltro('TODOS');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors cursor-pointer"
              >
                Restablecer Filtros
              </button>
            )}
          </div>
        </div>
      ) : vistaModo === 'acordeon' ? (
        // Accordion / Card View
        <div className="space-y-3">
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedFaqs[faq.id] ?? false;
            const catStyle = getCategoryStyle(faq.categoria);
            const isFirst = index === 0;
            const isLast = index === filteredFaqs.length - 1;

            return (
              <div
                key={faq.id}
                className={`bg-[#1a1a2e] rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  faq.activo
                    ? 'border-white/5 hover:border-white/15'
                    : 'border-white/5 opacity-75 bg-[#141424]'
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Reorder Controls + Info */}
                  <div className="flex items-start gap-3 flex-1">
                    {/* Reorder arrows */}
                    <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => handleMoveOrder(index, 'up')}
                        disabled={isFirst || reordering}
                        className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Subir posición"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveOrder(index, 'down')}
                        disabled={isLast || reordering}
                        className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-white/5 disabled:hover:text-slate-400 transition-colors cursor-pointer"
                        title="Bajar posición"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Order Badge */}
                    <div
                      className="w-7 h-7 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-slate-300 shrink-0"
                      title={`Orden #${faq.orden}`}
                    >
                      #{faq.orden}
                    </div>

                    {/* Question and details */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                          {faq.categoria}
                        </span>

                        {!faq.activo && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            Inactiva
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => toggleExpand(faq.id)}
                        className="text-base font-semibold text-white cursor-pointer hover:text-[#e8b86d] transition-colors flex items-center gap-2 group"
                      >
                        <span>{faq.pregunta}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 group-hover:text-[#e8b86d] transition-transform duration-200 shrink-0 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </h3>
                    </div>
                  </div>

                  {/* Right Actions: Switch + Edit + Delete */}
                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 w-full md:w-auto justify-between md:justify-end">
                    {/* Active Switch */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-slate-400 hidden sm:inline">
                        {faq.activo ? 'Visible' : 'Oculta'}
                      </span>
                      <div
                        onClick={() => handleToggleActivo(faq)}
                        className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                          faq.activo ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            faq.activo ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </label>

                    <div className="h-4 w-px bg-white/10 hidden sm:block" />

                    {/* Edit Button */}
                    <button
                      onClick={() => handleOpenEdit(faq)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-[#e8b86d]/15 text-slate-300 hover:text-[#e8b86d] border border-white/10 hover:border-[#e8b86d]/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                      title="Editar pregunta"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleOpenDelete(faq)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="sr-only sm:not-sr-only">Eliminar</span>
                    </button>
                  </div>
                </div>

                {/* Answer Preview (Accordion expanded) */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-black/20 animate-in fade-in duration-200">
                    <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#e8b86d]" />
                      Respuesta al cliente:
                    </div>
                    <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed bg-[#121220] p-4 rounded-xl border border-white/5">
                      {faq.respuesta}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Compact Table View
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-black/40 text-xs uppercase text-slate-400 border-b border-white/5">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-16 text-center">
                    Orden
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-24">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Pregunta
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-44">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3.5 max-w-xs">
                    Respuesta
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right w-44">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFaqs.map((faq, index) => {
                  const catStyle = getCategoryStyle(faq.categoria);
                  const isFirst = index === 0;
                  const isLast = index === filteredFaqs.length - 1;

                  return (
                    <tr
                      key={faq.id}
                      className={`hover:bg-white/5 transition-colors ${
                        !faq.activo ? 'opacity-70 bg-black/10' : ''
                      }`}
                    >
                      {/* Order column */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            #{faq.orden}
                          </span>
                          <div className="flex flex-col gap-0.5 ml-1">
                            <button
                              onClick={() => handleMoveOrder(index, 'up')}
                              disabled={isFirst || reordering}
                              className="text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(index, 'down')}
                              disabled={isLast || reordering}
                              className="text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status switch */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(faq)}
                          className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                            faq.activo
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border-white/10'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              faq.activo ? 'bg-emerald-400' : 'bg-slate-500'
                            }`}
                          />
                          {faq.activo ? 'Activo' : 'Oculto'}
                        </button>
                      </td>

                      {/* Question */}
                      <td className="px-4 py-3 font-medium text-white max-w-sm">
                        <p className="line-clamp-2">{faq.pregunta}</p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                          {faq.categoria}
                        </span>
                      </td>

                      {/* Answer truncated */}
                      <td className="px-4 py-3 text-slate-400 max-w-xs">
                        <p className="line-clamp-2 text-xs">{faq.respuesta}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(faq)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-[#e8b86d]/20 text-slate-300 hover:text-[#e8b86d] transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(faq)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit FAQ */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e8b86d] to-[#c49a3c] flex items-center justify-center text-white shadow-md">
                  {editingFaq ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingFaq ? 'Editar Pregunta Frecuente' : 'Nueva Pregunta Frecuente'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Completa la información para que los clientes resuelvan sus dudas en la tienda.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs: Form vs Live Customer Preview */}
            <div className="px-5 pt-3 flex items-center gap-2 border-b border-white/5 bg-black/10">
              <button
                type="button"
                onClick={() => setPreviewTab('form')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
                  previewTab === 'form'
                    ? 'border-[#e8b86d] text-[#e8b86d] bg-white/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Formulario de Edición
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  previewTab === 'preview'
                    ? 'border-[#e8b86d] text-[#e8b86d] bg-white/5'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Vista Previa del Cliente
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {previewTab === 'form' ? (
                <form id="faq-form" onSubmit={handleSaveFaq} className="space-y-4">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Categoría</span>
                      <span className="text-[11px] text-slate-500">
                        Selecciona o escribe una personalizada
                      </span>
                    </label>

                    {/* Predefined Category Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIAS_FAQ_PREDEFINIDAS.map((cat) => {
                        const isSelected =
                          formState.categoria === cat && !customCategoryInput.trim();
                        const style = getCategoryStyle(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setFormState((prev) => ({ ...prev, categoria: cat }));
                              setCustomCategoryInput('');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? `${style.bg} ${style.text} ${style.border} ring-1 ring-[#e8b86d]/40`
                                : 'bg-black/30 text-slate-400 border-white/10 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom category input */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={customCategoryInput}
                        onChange={(e) => {
                          setCustomCategoryInput(e.target.value);
                          if (e.target.value.trim()) {
                            setFormState((prev) => ({
                              ...prev,
                              categoria: e.target.value.trim(),
                            }));
                          }
                        }}
                        placeholder="O escribe otra categoría personalizada..."
                        className="w-full px-3.5 py-2 bg-black/30 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#e8b86d]/60"
                      />
                    </div>
                  </div>

                  {/* Question input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Pregunta <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {formState.pregunta.length}/500
                      </span>
                    </div>
                    <input
                      type="text"
                      maxLength={500}
                      value={formState.pregunta}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, pregunta: e.target.value }));
                        if (formErrors.pregunta) {
                          setFormErrors((prev) => ({ ...prev, pregunta: '' }));
                        }
                      }}
                      placeholder="Ej: ¿Cómo debo limpiar el envase de la vela cuando se acabe?"
                      className={`w-full px-3.5 py-2.5 bg-black/30 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e8b86d]/50 ${
                        formErrors.pregunta
                          ? 'border-rose-500/60 focus:border-rose-500'
                          : 'border-white/10 focus:border-[#e8b86d]/60'
                      }`}
                      required
                    />
                    {formErrors.pregunta && (
                      <p className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrors.pregunta}
                      </p>
                    )}
                  </div>

                  {/* Answer textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Respuesta detallada <span className="text-rose-400">*</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {formState.respuesta.length}/5000
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      maxLength={5000}
                      value={formState.respuesta}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, respuesta: e.target.value }));
                        if (formErrors.respuesta) {
                          setFormErrors((prev) => ({ ...prev, respuesta: '' }));
                        }
                      }}
                      placeholder="Escribe la respuesta clara y cordial. Puedes usar saltos de línea para listar recomendaciones..."
                      className={`w-full px-3.5 py-2.5 bg-black/30 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#e8b86d]/50 leading-relaxed ${
                        formErrors.respuesta
                          ? 'border-rose-500/60 focus:border-rose-500'
                          : 'border-white/10 focus:border-[#e8b86d]/60'
                      }`}
                      required
                    />
                    {formErrors.respuesta && (
                      <p className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrors.respuesta}
                      </p>
                    )}
                  </div>

                  {/* Row: Order & Visibility */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                    {/* Order */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        Orden de visualización
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formState.orden}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            orden: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-full px-3.5 py-2 bg-black/30 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#e8b86d]/60"
                      />
                      <p className="text-[11px] text-slate-500">
                        Un número menor aparece primero en la lista.
                      </p>
                    </div>

                    {/* Active toggle */}
                    <div className="space-y-1.5 flex flex-col justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Estado de visibilidad
                      </label>
                      <div className="flex items-center gap-3 p-2 bg-black/30 rounded-xl border border-white/10">
                        <div
                          onClick={() =>
                            setFormState((prev) => ({ ...prev, activo: !prev.activo }))
                          }
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ${
                            formState.activo ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              formState.activo ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-slate-200">
                          {formState.activo
                            ? 'Activa (visible al público)'
                            : 'Inactiva (solo borrador)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </form>
              ) : (
                // Live preview tab
                <div className="space-y-3 p-4 bg-black/40 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/10">
                    <span className="flex items-center gap-1.5 font-semibold text-[#e8b86d]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Previsualización en la Tienda Web
                    </span>
                    <span>Orden: #{formState.orden}</span>
                  </div>

                  {/* Customer Accordion Card Preview */}
                  <div className="p-4 rounded-xl bg-[#141424] border border-white/10 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1.5 ${
                          getCategoryStyle(
                            customCategoryInput.trim() || formState.categoria || 'General'
                          ).bg
                        } ${
                          getCategoryStyle(
                            customCategoryInput.trim() || formState.categoria || 'General'
                          ).text
                        } ${
                          getCategoryStyle(
                            customCategoryInput.trim() || formState.categoria || 'General'
                          ).border
                        }`}
                      >
                        {customCategoryInput.trim() || formState.categoria || 'General'}
                      </span>
                      {!formState.activo && (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                          (Oculta en tienda)
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-white">
                      {formState.pregunta || 'Escribe una pregunta arriba...'}
                    </h4>

                    <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-black/30 p-3 rounded-lg border border-white/5">
                      {formState.respuesta || 'La respuesta aparecerá formateada aquí...'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2.5 bg-black/20">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                form="faq-form"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#e8b86d] to-[#c49a3c] hover:from-[#f0c47d] hover:to-[#d4a849] text-black font-bold text-sm shadow-lg shadow-[#e8b86d]/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{editingFaq ? 'Guardar Cambios' : 'Crear Pregunta'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete */}
      {deleteModalOpen && faqToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">¿Eliminar esta pregunta frecuente?</h3>
              <p className="text-xs text-slate-400">
                Esta acción es permanente y eliminará la pregunta del portal y de la tienda web.
              </p>
              <div className="p-3 bg-black/30 rounded-xl border border-white/5 text-xs text-slate-300 italic text-left">
                &ldquo;{faqToDelete.pregunta}&rdquo;
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors cursor-pointer flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 transition-colors cursor-pointer flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Eliminar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
