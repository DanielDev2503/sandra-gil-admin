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
  Menu,
  X,
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
  const [isOpenMobile, setIsOpenMobile] = useState(false);


  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Floating Trigger Button */}
      <button
        onClick={() => setIsOpenMobile(true)}
        className="fixed top-4 left-4 z-30 p-2.5 bg-[#1a1a2e] text-slate-400 hover:text-white rounded-xl border border-white/10 shadow-lg cursor-pointer md:hidden flex items-center justify-center min-w-[44px] min-h-[44px]"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5 text-[#e8b86d]" />
      </button>

      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`min-h-screen bg-[#1a1a2e] border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 z-40 
          fixed inset-y-0 left-0 w-64 max-w-[80vw] 
          ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
          ${isCollapsed ? 'md:w-20' : 'md:w-64'}
        `}
      >
        {/* Brand */}
        <div className={`p-4 border-b border-white/5 flex items-center justify-between ${isCollapsed ? 'md:justify-center' : ''}`}>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e8b86d] to-[#c49a3c] flex items-center justify-center shadow-lg shadow-[#e8b86d]/20 shrink-0">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div className={`${isCollapsed ? 'md:hidden' : 'block'} shrink-0`}>
              <p className="text-sm font-bold text-white leading-tight">Sandra Gil</p>
              <p className="text-xs text-slate-500">Administración</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer hidden md:block ${
                isCollapsed ? 'mt-2' : ''
              }`}
              aria-label={isCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={() => setIsOpenMobile(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer md:hidden flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                onClick={() => setIsOpenMobile(false)}
                title={isCollapsed ? label : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group border border-transparent ${
                  isCollapsed ? 'md:justify-center md:px-0' : ''
                } ${
                  isActive
                    ? 'bg-[#e8b86d]/10 text-[#e8b86d] border-[#e8b86d]/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isActive ? 'text-[#e8b86d]' : ''
                  }`}
                />
                <span className={`${isCollapsed ? 'md:hidden' : 'block'} truncate`}>{label}</span>
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
              isCollapsed ? 'md:justify-center md:px-0' : 'px-4'
            }`}
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-200 shrink-0" />
            <span className={`${isCollapsed ? 'md:hidden' : 'block'} truncate`}>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

