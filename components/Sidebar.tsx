'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Flame,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/ordenes', label: 'Órdenes', icon: ShoppingBag },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside
      className={`min-h-screen bg-[#1a1a2e] border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand */}
      <div className={`p-4 border-b border-white/5 flex items-center justify-between ${isCollapsed ? 'justify-center' : ''}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b86d] to-[#c49a3c] flex items-center justify-center shadow-lg shadow-[#e8b86d]/20 shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Sandra Gil</p>
              <p className="text-xs text-slate-500">Administración</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b86d] to-[#c49a3c] flex items-center justify-center shadow-lg shadow-[#e8b86d]/20 shrink-0">
            <Flame className="w-5 h-5 text-white" />
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer hidden md:block ${
            isCollapsed ? 'mt-2' : ''
          }`}
          aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isCollapsed ? 'justify-center px-0' : ''
              } ${
                isActive
                  ? 'bg-[#e8b86d]/10 text-[#e8b86d] border border-[#e8b86d]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                  isActive ? 'text-[#e8b86d]' : ''
                }`}
              />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          id="btn-logout"
          onClick={handleLogout}
          title={isCollapsed ? 'Cerrar sesión' : undefined}
          className={`flex items-center gap-3 w-full py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group cursor-pointer ${
            isCollapsed ? 'justify-center px-0' : 'px-4'
          }`}
        >
          <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 shrink-0" />
          {!isCollapsed && <span className="truncate">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}

