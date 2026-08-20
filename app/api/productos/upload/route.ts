export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { applyWatermark } from '@/lib/watermark';

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

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
          error: `Formato de imagen no permitido (${rawType || 'desconocido'}). Solo se admiten WebP, PNG y JPEG.`,
        },
        { status: 400 }
      );
    }

    // 2. Validar Tamaño Máximo (3MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `El archivo es demasiado pesado (${sizeMb} MB). El límite máximo permitido es 3 MB.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Validar buffer original
    if (!originalBuffer || originalBuffer.length === 0) {
      return NextResponse.json(
        { error: 'El archivo recibido está vacío' },
        { status: 400 }
      );
    }

    if (originalBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'El archivo supera el tamaño máximo permitido de 3 MB.' },
        { status: 400 }
      );
    }

    // 3. Aplicar Marca de Agua (con fallback seguro en caso de error)
    let watermarkedBuffer: Buffer = originalBuffer;
    try {
      const processed = await applyWatermark(originalBuffer);
      if (processed && processed.length > 0) {
        watermarkedBuffer = processed;
      }
    } catch (watermarkErr) {
      console.warn('⚠️ No se pudo aplicar la marca de agua, usando buffer original:', watermarkErr);
      watermarkedBuffer = originalBuffer;
    }

    // Determinar extensión y tipo de contenido final
    const contentType = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
    let ext = 'png';
    if (contentType === 'image/webp') ext = 'webp';
    else if (contentType === 'image/jpeg') ext = 'jpg';
    else if (contentType === 'image/png') ext = 'png';

    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `velas/${uniqueName}`;

    // Convert Buffer to Web API Blob to prevent binary string corruption
    const uploadBlob = new Blob([new Uint8Array(watermarkedBuffer)], { type: contentType });

    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, uploadBlob, {
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
