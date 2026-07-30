import { createClient } from '@/lib/supabase';

/**
 * Sube una imagen al bucket 'productos' de Supabase Storage.
 * Retorna la URL pública del archivo subido.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `velas/${uniqueName}`;

  const { error } = await supabase.storage
    .from('productos')
    .upload(filePath, file, { upsert: true });

  if (error) {
    throw new Error(`Error al subir imagen: ${error.message}`);
  }

  const { data } = supabase.storage.from('productos').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Elimina una imagen del bucket 'productos' de Supabase Storage
 * a partir de su URL pública.
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  if (!publicUrl) return;

  const supabase = createClient();

  // Extraer el path relativo desde la URL pública
  // Formato: https://{project}.supabase.co/storage/v1/object/public/productos/{path}
  const marker = '/storage/v1/object/public/productos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;

  const filePath = publicUrl.substring(idx + marker.length);

  const { error } = await supabase.storage
    .from('productos')
    .remove([filePath]);

  if (error) {
    console.error('Error al eliminar imagen:', error.message);
  }
}
