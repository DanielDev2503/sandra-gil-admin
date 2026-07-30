import { createClient } from '@/lib/supabase';

/**
 * Sube una imagen al bucket 'productos' de Supabase Storage.
 * Retorna la URL pública del archivo subido.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/productos/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al subir imagen con marca de agua');
  }

  const data = await response.json();
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
