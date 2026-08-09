export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { applyWatermark } from '@/lib/watermark';

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

    const arrayBuffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(arrayBuffer);

    // Validate original buffer
    if (!originalBuffer || originalBuffer.length === 0) {
      return NextResponse.json(
        { error: 'El archivo recibido está vacío' },
        { status: 400 }
      );
    }

    // Apply watermark with safe fallback to originalBuffer on any error
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

    const contentType = file.type || 'image/png';
    const ext = file.name ? file.name.split('.').pop() : (contentType.split('/')[1] || 'png');
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `velas/${uniqueName}`;

    // Convert Buffer to Web API Blob to prevent binary string corruption in Next.js runtime
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
