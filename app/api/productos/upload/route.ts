export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { applyWatermark } from '@/lib/watermark';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
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

    // 2. Validar Tamaño Máximo (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      return NextResponse.json(
        {
          error: `El archivo es demasiado pesado (${sizeMb} MB). El límite máximo permitido es 10 MB.`,
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

    // 4. Conservar marca de agua si el flujo actual incluye lógica de servidor
    const watermarkedBuffer = await applyWatermark(buffer);

    // 5. Procesar con sharp dinámicamente: redimensionar máx 1200px ancho (sin agrandar), WebP calidad 80
    const { default: sharp } = await import('sharp');
    const optimizedBuffer = await sharp(watermarkedBuffer)
      .rotate()
      .resize({
        width: 1200,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    // 6. Generar nombre de archivo con extensión obligatoria .webp
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const filePath = `velas/${uniqueName}`;

    // 7. Subida directa a Supabase Storage con metadatos HTTP explícitos (1 año de caché)
    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, optimizedBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000', // 1 año (inmutable)
        upsert: false,
      });

    if (uploadError) {
      console.error('Error al subir imagen a Supabase Storage:', uploadError);
      return NextResponse.json(
        { error: `Error al subir a Supabase Storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 7. Obtener y retornar la URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from('productos').getPublicUrl(filePath);

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'No se pudo obtener la URL pública de la imagen en Supabase' },
        { status: 500 }
      );
    }

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    console.error('Error procesando subida de imagen:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar la imagen' },
      { status: 500 }
    );
  }
}
