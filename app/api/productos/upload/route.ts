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

    // Apply watermark
    const watermarkedBuffer = await applyWatermark(originalBuffer);

    const ext = file.name.split('.').pop() ?? 'jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `velas/${uniqueName}`;

    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from('productos')
      .upload(filePath, watermarkedBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Error al subir a Supabase: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from('productos').getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: data.publicUrl });
  } catch (error: any) {
    console.error('Error procesando subida de imagen:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar la imagen' },
      { status: 500 }
    );
  }
}
