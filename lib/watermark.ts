import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

export async function applyWatermark(inputBuffer: Buffer): Promise<Buffer> {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-sandra.png');
    if (!fs.existsSync(logoPath)) {
      return inputBuffer;
    }

    const imageMetadata = await sharp(inputBuffer).metadata();
    const width = imageMetadata.width || 800;
    const watermarkWidth = Math.round(width * 0.25); // 25% del ancho

    const watermarkBuffer = await sharp(logoPath)
      .resize(watermarkWidth)
      .ensureAlpha(0.4) // 40% opacidad
      .toBuffer();

    return await sharp(inputBuffer)
      .composite([{ input: watermarkBuffer, gravity: 'southeast' }])
      .toBuffer();
  } catch (error) {
    console.warn('⚠️ No se pudo aplicar la marca de agua, usando imagen limpia:', error);
    return inputBuffer;
  }
}
