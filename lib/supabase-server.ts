import { createClient } from '@supabase/supabase-js';

/**
 * Cliente Supabase server-side con service role key.
 * Úsalo SOLO en API routes / server actions para operaciones
 * que requieren permisos elevados (ej: subir a Storage sin auth del browser).
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Faltan variables NEXT_PUBLIC_SUPABASE_URL o SUPABASE_ANON_KEY'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
