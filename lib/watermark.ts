import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  // Validate input buffer
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error('applyWatermark recibió un buffer vacío o nulo');
  }

  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-sandra.png');
    if (!fs.existsSync(logoPath)) {
      console.warn('⚠️ Logo de marca de agua no encontrado en:', logoPath);
      return inputBuffer;
    }

    const imageMetadata = await sharp(inputBuffer).metadata();
    const width = imageMetadata.width || 800;
    const watermarkWidth = Math.round(width * 0.25); // 25% del ancho

    const watermarkBuffer = await sharp(logoPath)
      .resize(watermarkWidth)
      .ensureAlpha(0.4) // 40% opacidad
      .toBuffer();

    const result = await sharp(inputBuffer)
      .composite([{ input: watermarkBuffer, gravity: 'southeast' }])
      .toBuffer();

    // Validate output buffer — never return empty
    if (!result || result.length === 0) {
      console.warn('⚠️ Sharp devolvió un buffer vacío, usando imagen original');
      return inputBuffer;
    }

    return result;
  } catch (error) {
    console.warn('⚠️ No se pudo aplicar la marca de agua, usando imagen limpia:', error);
    return inputBuffer;
  }
}
