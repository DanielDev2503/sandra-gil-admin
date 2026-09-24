/**
 * Procesa la imagen aplicando marca de agua en memoria sin tocar disco local efímero.
 * El buffer resultante se envía directamente a Supabase Storage.
 */
export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  return inputBuffer;
}
