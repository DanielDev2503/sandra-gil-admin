/**
 * Deprecated / Inert: Watermark helper previously used sharp (which required native bindings).
 * Image uploads now stream directly to Supabase Storage.
 */
export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  return inputBuffer;
}
