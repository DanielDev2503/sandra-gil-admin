'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ShoppingBag,
  Package,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';

interface DashboardData {
  totalVentas: number;
  pedidosMes: number;
  pedidosPendientes: number;
  stockBajo: number;
  ultimosPedidos: Array<{
    id: string;
    cliente_nombre: string;
    total_pagado: number;
    estado_envio: string;
    creado_en: string;
  }>;
}

const estadoEnvioConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  APPROVED: { label: 'Aprobado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  SHIPPED: { label: 'Enviado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  DELIVERED: { label: 'Entregado', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DECLINED: { label: 'Cancelado', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent} transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#e8b86d]" />
      </div>
    );
  }

  const formatCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Resumen del negocio</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Ventas totales"
          value={formatCOP(data?.totalVentas ?? 0)}
          subtitle="Pedidos pagados"
          icon={TrendingUp}
          accent="bg-[#e8b86d]/10 text-[#e8b86d]"
        />
        <StatCard
          title="Pedidos este mes"
          value={String(data?.pedidosMes ?? 0)}
          subtitle="Pagados en el mes actual"
          icon={ShoppingBag}
          accent="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          title="Por despachar"
          value={String(data?.pedidosPendientes ?? 0)}
          subtitle="Estado APPROVED"
          icon={Package}
          accent="bg-purple-500/10 text-purple-400"
        />
        <StatCard
          title="Alertas de stock"
          value={String(data?.stockBajo ?? 0)}
          subtitle="Productos con menos de 5 unidades"
          icon={AlertTriangle}
          accent={
            (data?.stockBajo ?? 0) > 0
              ? 'bg-red-500/10 text-red-400'
              : 'bg-green-500/10 text-green-400'
          }
        />
      </div>

      {/* Recent Orders */}
      <div className="bg-[#1a1a2e] border border-white/5 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Pedidos recientes</h2>
          <Link
            href="/admin/ordenes"
            className="flex items-center gap-1.5 text-sm text-[#e8b86d] hover:text-[#d4a85a] transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="divide-y divide-white/5">
          {data?.ultimosPedidos.length === 0 ? (
            <p className="text-center text-slate-500 py-12">No hay pedidos aún</p>
          ) : (
            data?.ultimosPedidos.map((p) => {
              const config = estadoEnvioConfig[p.estado_envio] ?? estadoEnvioConfig.PENDING;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#e8b86d]/10 flex items-center justify-center text-[#e8b86d] text-sm font-bold">
                      {p.cliente_nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.cliente_nombre}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.creado_en).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full border ${config.color}`}
                    >
                      {config.label}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {formatCOP(p.total_pagado)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
