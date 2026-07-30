import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Aplica una marca de agua (logo Sandra Gil) sobre el buffer de una imagen.
 * - Redimensiona la marca de agua al ~22% del ancho de la imagen principal.
 * - Ajusta la opacidad al ~40%.
 * - Ubica la marca de agua en la esquina inferior derecha con un margen de seguridad.
 * - Retorna el buffer resultante de la imagen procesada.
 */
export async function applyWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), 'public', 'logo-sandra.png');

  if (!fs.existsSync(logoPath)) {
    console.warn(`[watermark] Logo no encontrado en ${logoPath}, omitiendo marca de agua.`);
    return imageBuffer;
  }

  try {
    const mainImage = sharp(imageBuffer);
    const metadata = await mainImage.metadata();

    const mainWidth = metadata.width || 800;
    const mainHeight = metadata.height || 800;

    // Ancho de marca de agua: 22% del ancho principal
    const watermarkWidth = Math.max(80, Math.round(mainWidth * 0.22));

    // Redimensionar logo y aplicar opacidad del 40% (0.4)
    const watermarkBuffer = await sharp(logoPath)
      .resize({ width: watermarkWidth })
      .ensureAlpha()
      .linear([1, 1, 1, 0.4], [0, 0, 0, 0])
      .toBuffer();

    const watermarkMeta = await sharp(watermarkBuffer).metadata();
    const wWidth = watermarkMeta.width || watermarkWidth;
    const wHeight = watermarkMeta.height || Math.round(watermarkWidth * 0.4);

    // Margen del 3% desde el borde inferior derecho
    const margin = Math.max(12, Math.round(mainWidth * 0.03));

    const left = Math.max(0, mainWidth - wWidth - margin);
    const top = Math.max(0, mainHeight - wHeight - margin);

    // Superponer marca de agua y exportar buffer
    const resultBuffer = await mainImage
      .composite([
        {
          input: watermarkBuffer,
          top,
          left,
        },
      ])
      .toBuffer();

    return resultBuffer;
  } catch (error) {
    console.error('Error aplicando marca de agua:', error);
    return imageBuffer;
  }
}
