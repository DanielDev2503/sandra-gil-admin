import { applyClientWatermark } from './watermark-client';

/**
 * Sube una imagen al bucket 'productos' de Supabase Storage.
 * Aplica automáticamente la marca de agua en el navegador de forma fluida y sin dependencias nativas.
 * Retorna la URL pública del archivo subido.
 */
export async function uploadProductImage(file: File): Promise<string> {
  // Aplicar marca de agua en el cliente de forma segura
  const processedFile = typeof window !== 'undefined'
    ? await applyClientWatermark(file)
    : file;

  const formData = new FormData();
  formData.append('file', processedFile);

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
 * a partir de su URL pública, usando el API route server-side.
 */
export async function deleteProductImage(publicUrl: string): Promise<void> {
  if (!publicUrl) return;

  // Validar que sea una URL de Supabase Storage
  const marker = '/storage/v1/object/public/productos/';
  if (!publicUrl.includes(marker)) return;

  try {
    const response = await fetch('/api/productos/delete-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicUrl }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Error al eliminar imagen:', err.error || response.statusText);
    }
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
  }
}
