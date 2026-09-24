/**
 * Utilidad normalizadora para generación de slugs semánticos SEO-friendly.
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos y tildes
    .replace(/[^a-z0-9 -]/g, '')     // Elimina caracteres especiales
    .replace(/\s+/g, '-')           // Reemplaza espacios por guiones
    .replace(/-+/g, '-');           // Elimina guiones consecutivos
}
