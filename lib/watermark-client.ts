/**
 * Aplica la marca de agua (logo Sandra Gil) en el cliente usando HTML5 Canvas.
 * Esto evita dependencias de binarios nativos de C++ (como libvips/sharp) en el servidor,
 * garantizando compatibilidad universal en cualquier entorno de despliegue.
 */

export interface WatermarkOptions {
  logoUrl?: string;
  opacity?: number;
  widthRatio?: number; // Proporción del ancho de la imagen principal (ej: 0.24 = 24%)
  paddingRatio?: number; // Margen respecto al borde inferior derecho
}

export async function applyClientWatermark(
  file: File,
  options: WatermarkOptions = {}
): Promise<File> {
  if (typeof window === 'undefined') {
    return file;
  }

  const {
    logoUrl = '/logo-sandra.png',
    opacity = 0.55,
    widthRatio = 0.24,
    paddingRatio = 0.035,
  } = options;

  // Solo procesar archivos de tipo imagen
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise<File>((resolve) => {
    let mainImgUrl: string | null = null;
    let hasFinished = false;

    const cleanup = () => {
      if (mainImgUrl) {
        URL.revokeObjectURL(mainImgUrl);
      }
    };

    const finishSafely = (resultFile: File, err?: any) => {
      if (hasFinished) return;
      hasFinished = true;
      cleanup();
      if (err) {
        console.warn('⚠️ No se pudo aplicar la marca de agua en el cliente, usando original:', err);
      }
      resolve(resultFile);
    };

    try {
      mainImgUrl = URL.createObjectURL(file);

      const mainImg = new Image();
      const logoImg = new Image();

      let mainLoaded = false;
      let logoLoaded = false;

      const processWatermark = () => {
        if (!mainLoaded || !logoLoaded || hasFinished) return;

        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            finishSafely(file, 'No se pudo obtener el contexto 2D del Canvas');
            return;
          }

          const width = mainImg.naturalWidth || mainImg.width;
          const height = mainImg.naturalHeight || mainImg.height;

          if (!width || !height) {
            finishSafely(file, 'Dimensiones de imagen inválidas');
            return;
          }

          canvas.width = width;
          canvas.height = height;

          // Configurar alta calidad de renderizado
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 1. Dibujar la imagen original
          ctx.drawImage(mainImg, 0, 0, width, height);

          // 2. Calcular dimensiones de la marca de agua
          const logoAspect = (logoImg.naturalHeight || logoImg.height) / (logoImg.naturalWidth || logoImg.width || 1);
          const wmWidth = Math.round(width * widthRatio);
          const wmHeight = Math.round(wmWidth * logoAspect);

          const padding = Math.round(width * paddingRatio);
          const x = width - wmWidth - padding;
          const y = height - wmHeight - padding;

          // 3. Dibujar el logo con opacidad sutil
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.drawImage(logoImg, x, y, wmWidth, wmHeight);
          ctx.restore();

          // 4. Exportar como Blob con el tipo original
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = 0.92;

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                finishSafely(file, 'toBlob devolvió nulo');
                return;
              }

              const watermarkedFile = new File([blob], file.name, {
                type: mimeType,
                lastModified: Date.now(),
              });

              finishSafely(watermarkedFile);
            },
            mimeType,
            quality
          );
        } catch (renderError) {
          finishSafely(file, renderError);
        }
      };

      mainImg.onload = () => {
        mainLoaded = true;
        processWatermark();
      };
      mainImg.onerror = (e) => finishSafely(file, e);

      logoImg.onload = () => {
        logoLoaded = true;
        processWatermark();
      };
      logoImg.onerror = (e) => finishSafely(file, e);

      mainImg.src = mainImgUrl;
      logoImg.src = logoUrl;
    } catch (e) {
      finishSafely(file, e);
    }
  });
}
