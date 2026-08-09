export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * DELETE /api/productos/delete-image
 * Body: { publicUrl: string }
 *
 * Deletes a product image from Supabase Storage using the server-side client.
 * This is more reliable than deleting from the browser because it uses
 * the service role key (or anon key with proper RLS policies).
 */
export async function POST(request: Request) {
  try {
    const { publicUrl } = await request.json();

    if (!publicUrl || typeof publicUrl !== 'string') {
      return NextResponse.json(
        { error: 'Se requiere publicUrl' },
        { status: 400 }
      );
    }

    // Extract the relative path from the public URL
    // Format: https://{project}.supabase.co/storage/v1/object/public/productos/{path}
    const marker = '/storage/v1/object/public/productos/';
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) {
      return NextResponse.json(
        { error: 'URL de imagen no válida para el bucket productos' },
        { status: 400 }
      );
    }

    const filePath = publicUrl.substring(idx + marker.length);

    const supabase = createServerClient();
    const { error } = await supabase.storage
      .from('productos')
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar imagen de Storage:', error.message);
      return NextResponse.json(
        { error: `Error al eliminar: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('Error en delete-image:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
