import { createClient, SupabaseClient } from '@supabase/supabase-js';

const globalForSupabase = globalThis as unknown as {
  supabaseServerClient: SupabaseClient | undefined;
};

/**
 * Cliente Supabase server-side singleton con persistencia en globalThis.
 * Úsalo en API routes / server actions para operaciones
 * en Storage y Auth sin reinstanciar clientes innecesariamente.
 */
export function createServerClient(): SupabaseClient {
  if (globalForSupabase.supabaseServerClient) {
    return globalForSupabase.supabaseServerClient;
  }

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

  const client = createClient(url, key, {
    auth: { persistSession: false },
  });

  globalForSupabase.supabaseServerClient = client;
  return client;
}

