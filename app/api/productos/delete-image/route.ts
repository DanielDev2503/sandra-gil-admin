export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { deleteStorageFilesServer } from '@/lib/storage-server';

/**
 * POST /api/productos/delete-image
 * Body: { publicUrl?: string, publicUrls?: string[] }
 *
 * Elimina imágenes de Supabase Storage de manera segura en el servidor.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const urls: string[] = [];

    if (typeof body.publicUrl === 'string' && body.publicUrl.trim()) {
      urls.push(body.publicUrl.trim());
    }

    if (Array.isArray(body.publicUrls)) {
      for (const u of body.publicUrls) {
        if (typeof u === 'string' && u.trim()) {
          urls.push(u.trim());
        }
      }
    }

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere publicUrl o publicUrls' },
        { status: 400 }
      );
    }

    const { deleted, errors } = await deleteStorageFilesServer(urls, 'productos');

    if (errors.length > 0 && deleted.length === 0) {
      return NextResponse.json(
        { error: `Error al eliminar de Storage: ${errors.join(', ')}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted, errors });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno';
    console.error('Error en delete-image:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

