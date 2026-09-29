'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  Loader2,
  Share,
  Send,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/ToastContext';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState =
  | 'CHECKING'
  | 'UNSUPPORTED'
  | 'DENIED'
  | 'IOS_NEEDS_PWA'
  | 'SUBSCRIBED'
  | 'UNSUBSCRIBED';

interface PushNotificationToggleProps {
  collapsed?: boolean;
}

export default function PushNotificationToggle({ collapsed = false }: PushNotificationToggleProps) {
  const { showToast } = useToast();
  const [state, setState] = useState<PushState>('CHECKING');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // Comprobar soporte y estado inicial de suscripción
  const checkSubscription = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // 1. Detección de iOS PWA Standalone
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const isStandalone =
      ('standalone' in window.navigator &&
        (window.navigator as unknown as { standalone: boolean }).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setState('IOS_NEEDS_PWA');
      return;
    }

    // 2. Verificar soporte en navegador
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('UNSUPPORTED');
      return;
    }

    // 3. Permiso bloqueado
    if (Notification.permission === 'denied') {
      setState('DENIED');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) {
        setState('UNSUBSCRIBED');
        return;
      }

      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setState('SUBSCRIBED');
      } else {
        setState('UNSUBSCRIBED');
      }
    } catch (err) {
      console.error('[PushToggle] Error verificando suscripción:', err);
      setState('UNSUBSCRIBED');
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Activar o desactivar notificaciones
  const handleToggle = async () => {
    if (state === 'IOS_NEEDS_PWA') {
      setShowIosGuide(true);
      return;
    }

    if (state === 'DENIED') {
      showToast('Permiso de notificaciones bloqueado en este navegador. Habilítalo en los ajustes del sitio.', 'error');
      return;
    }

    if (state === 'UNSUPPORTED') {
      showToast('Este navegador no es compatible con Web Push.', 'error');
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      showToast('Clave pública VAPID no configurada en el servidor.', 'error');
      return;
    }

    setLoading(true);

    try {
      // 1. Pedir permiso explícito al usuario
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {
        setState('DENIED');
        showToast('Has denegado el permiso para recibir notificaciones.', 'error');
        setLoading(false);
        return;
      }

      if (permission !== 'granted') {
        setState('UNSUBSCRIBED');
        setLoading(false);
        return;
      }

      // 2. Registrar el Service Worker si no existe
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Manejo de suscripción actual
      const existingSub = await reg.pushManager.getSubscription();

      if (state === 'SUBSCRIBED' && existingSub) {
        // Desuscribir
        await fetch('/api/admin/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existingSub.endpoint }),
        }).catch(() => {});

        await existingSub.unsubscribe();
        setState('UNSUBSCRIBED');
        showToast('Notificaciones push desactivadas en este dispositivo.');
      } else {
        // Suscribir
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey as unknown as BufferSource,
        });

        const res = await fetch('/api/admin/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSub.toJSON()),
        });

        if (!res.ok) {
          throw new Error('Error registrando suscripción en el servidor');
        }

        setState('SUBSCRIBED');
        showToast('¡Notificaciones push activadas con éxito! Recibirás alertas de nuevos pedidos.');
      }
    } catch (err: unknown) {
      console.error('[PushToggle] Error al alternar notificaciones:', err);
      showToast(err instanceof Error ? err.message : 'Error al configurar notificaciones push', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Enviar notificación de prueba
  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/push/test', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast('🔔 Notificación de prueba enviada a tus dispositivos');
      } else {
        showToast(data.error || 'Error al enviar prueba', 'error');
      }
    } catch {
      showToast('Error de conexión al enviar prueba', 'error');
    } finally {
      setTesting(false);
    }
  };

  if (state === 'CHECKING') {
    return (
      <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Vista colapsada para sidebar pequeño en desktop
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 p-2 bg-white/5 rounded-xl border border-white/5">
        <button
          onClick={handleToggle}
          disabled={loading}
          title={
            state === 'SUBSCRIBED'
              ? 'Notificaciones Push Activas (Clic para desactivar)'
              : state === 'DENIED'
              ? 'Notificaciones bloqueadas'
              : state === 'IOS_NEEDS_PWA'
              ? 'Requiere instalar en pantalla de inicio de iOS'
              : 'Activar Notificaciones Push'
          }
          className={`p-2 rounded-lg transition-all cursor-pointer ${
            state === 'SUBSCRIBED'
              ? 'bg-[#e8b86d]/20 text-[#e8b86d] hover:bg-[#e8b86d]/30'
              : state === 'DENIED'
              ? 'bg-red-500/10 text-red-400'
              : 'text-slate-400 hover:text-white hover:bg-white/10'
          }`}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : state === 'SUBSCRIBED' ? (
            <BellRing className="w-5 h-5 text-[#e8b86d]" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                state === 'SUBSCRIBED'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : state === 'DENIED'
                  ? 'bg-red-500/15 text-red-400'
                  : state === 'IOS_NEEDS_PWA'
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-white/5 text-slate-400'
              }`}
            >
              {state === 'SUBSCRIBED' ? (
                <BellRing className="w-4 h-4" />
              ) : state === 'DENIED' ? (
                <BellOff className="w-4 h-4" />
              ) : state === 'IOS_NEEDS_PWA' ? (
                <Share className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-white leading-none">Alertas de Pedidos</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {state === 'SUBSCRIBED'
                  ? 'Push activo en este equipo'
                  : state === 'DENIED'
                  ? 'Permiso bloqueado'
                  : state === 'IOS_NEEDS_PWA'
                  ? 'Instala la app en iOS'
                  : 'Recibe alertas en segundo plano'}
              </p>
            </div>
          </div>

          {/* Botón Switch Toggle */}
          {state !== 'UNSUPPORTED' && state !== 'DENIED' && state !== 'IOS_NEEDS_PWA' && (
            <button
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                state === 'SUBSCRIBED' ? 'bg-[#e8b86d]' : 'bg-slate-700'
              }`}
              aria-label="Alternar notificaciones push"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#1a1a2e] shadow-lg ring-0 transition duration-200 ease-in-out ${
                  state === 'SUBSCRIBED' ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>

        {/* Guía contextual para iOS si no es standalone */}
        {state === 'IOS_NEEDS_PWA' && (
          <button
            onClick={() => setShowIosGuide(true)}
            className="w-full text-left p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-amber-300 hover:bg-amber-500/15 transition-all text-xs"
          >
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              En iPhone se requiere añadir a pantalla de inicio para recibir alertas. <u>Toca para ver cómo</u>.
            </span>
          </button>
        )}

        {/* Advertencia si el usuario bloqueó el permiso */}
        {state === 'DENIED' && (
          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Permiso bloqueado. Debes habilitarlo en los ajustes del navegador.</span>
          </div>
        )}

        {/* Botón de Enviar Notificación de Prueba si está suscrito */}
        {state === 'SUBSCRIBED' && (
          <button
            onClick={handleTestNotification}
            disabled={testing}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-[#e8b86d]/10 hover:bg-[#e8b86d]/20 text-[#e8b86d] border border-[#e8b86d]/20 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            {testing ? 'Enviando alerta...' : 'Enviar alerta de prueba'}
          </button>
        )}
      </div>

      {/* Modal Instructivo para iOS PWA Standalone */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl">
                <Share className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar en iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Requisito de Apple para Web Push</p>
              </div>
            </div>

            <ol className="text-xs text-slate-300 space-y-3 mb-6 pl-1">
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white font-bold shrink-0">1</span>
                <span>Abre este panel de administración en el navegador <strong>Safari</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white font-bold shrink-0">2</span>
                <span>Toca el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba <Share className="inline w-3.5 h-3.5 text-blue-400 mx-0.5" />) en la barra inferior.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white font-bold shrink-0">3</span>
                <span>Desplázate hacia abajo y selecciona <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-white font-bold shrink-0">4</span>
                <span>Abre la app desde tu pantalla de inicio y pulsa <strong>Activar Alertas</strong>. ¡Listo!</span>
              </li>
            </ol>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-[#e8b86d] hover:bg-[#d4a85a] text-[#1a1a2e] font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
