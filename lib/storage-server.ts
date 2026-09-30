import sharp from 'sharp';
import { createServerClient } from './supabase-server';

/**
 * Extrae la ruta relativa dentro del bucket de Supabase a partir de la URL pública.
 * Ejemplo: "https://.../storage/v1/object/public/productos/velas/123.webp" -> "velas/123.webp"
 */
export function extractStoragePath(publicUrl: string, bucket = 'productos'): string | null {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.substring(idx + marker.length));
}

/**
 * Elimina una lista de archivos de Supabase Storage usando el cliente de servidor.
 * Acepta URLs públicas completas o paths relativos.
 */
export async function deleteStorageFilesServer(
  urlsOrPaths: string[],
  bucket = 'productos'
): Promise<{ deleted: string[]; errors: string[] }> {
  if (!urlsOrPaths || urlsOrPaths.length === 0) {
    return { deleted: [], errors: [] };
  }

  const paths = urlsOrPaths
    .map((item) => (item.includes('/storage/v1/object/public/') ? extractStoragePath(item, bucket) : item))
    .filter((p): p is string => Boolean(p && p.trim()));

  if (paths.length === 0) {
    return { deleted: [], errors: [] };
  }

  // Desduplicar paths
  const uniquePaths = Array.from(new Set(paths));
  const supabase = createServerClient();

  const { data, error } = await supabase.storage.from(bucket).remove(uniquePaths);

  if (error) {
    console.error(`[StorageServer] Error eliminando ${uniquePaths.length} archivo(s) de "${bucket}":`, error.message);
    return { deleted: [], errors: [error.message] };
  }

  const deletedNames = (data || []).map((d) => d.name);
  return { deleted: deletedNames, errors: [] };
}

/**
 * Optimiza un Buffer con Sharp (máximo 1200px ancho, sin agrandar, WebP 80%, metadatos inmutables)
 * y lo sube directamente a Supabase Storage con cacheControl: 31536000.
 */
export async function uploadOptimizedBufferToStorage(
  filePath: string,
  buffer: Buffer,
  bucket = 'productos'
): Promise<string> {
  const optimizedBuffer = await sharp(buffer)
    .rotate()
    .resize({
      width: 1200,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  const cleanPath = filePath.endsWith('.webp')
    ? filePath
    : `${filePath.replace(/\.[^/.]+$/, '')}.webp`;

  const supabase = createServerClient();
  const { error } = await supabase.storage.from(bucket).upload(cleanPath, optimizedBuffer, {
    contentType: 'image/webp',
    cacheControl: '31536000', // 1 año (inmutable)
    upsert: false,
  });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(cleanPath);

  return publicUrl;
}
