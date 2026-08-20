export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/avif'];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo de imagen' },
        { status: 400 }
      );
    }

    // 1. Validar Tipo MIME
    const rawType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(rawType)) {
      return NextResponse.json(
        {
          error: `Formato de imagen no permitido (${rawType || 'desconocido'}). Solo se admiten WebP, PNG, JPEG y AVIF.`,
        },
        { status: 400 }
      );
    }

    // 2. Validar Tamaño Máximo (5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `El archivo es demasiado pesado (${sizeMb} MB). El límite máximo permitido es 5 MB.`,
        },
        { status: 400 }
      );
    }

    // 3. Convertir File a ArrayBuffer y Buffer nativo de Node.js
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: 'El archivo recibido está vacío' },
        { status: 400 }
      );
    }

    // 4. Determinar extensión y tipo de contenido
    const contentType = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
    let ext = 'png';
    if (contentType === 'image/webp') ext = 'webp';
    else if (contentType === 'image/jpeg') ext = 'jpg';
    else if (contentType === 'image/png') ext = 'png';
    else if (contentType === 'image/avif') ext = 'avif';

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `velas/${uniqueName}`;

    // 5. Subida directa a Supabase Storage con cliente autenticado del servidor
    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, buffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir imagen a Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: `Error al subir a Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Obtener y retornar la URL pública
    const { data } = supabase.storage.from('productos').getPublicUrl(filePath);

    if (!data || !data.publicUrl) {
      return NextResponse.json(
        { error: 'No se pudo obtener la URL pública de la imagen en Supabase' },
        { status: 500 }
      );
    }

    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error: any) {
    console.error('Error procesando subida de imagen:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar la imagen' },
      { status: 500 }
    );
  }
}
