import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase server-side con service role key.
 * Úsalo SOLO en API routes / server actions para operaciones
 * que requieren permisos elevados (ej: subir a Storage sin auth del browser).
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
