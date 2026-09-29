import fs from 'fs';
import path from 'path';

// Cargar .env.local o .env antes de cualquier evaluación de módulos de DB
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envLocalPath)) {
  process.loadEnvFile?.(envLocalPath);
} else if (fs.existsSync(envPath)) {
  process.loadEnvFile?.(envPath);
}

import sharp from 'sharp';

interface FileToMigrate {
  folder: string;
  name: string;
  size: number;
}

interface MigrationStats {
  totalFound: number;
  toProcess: number;
  processed: number;
  skipped: number;
  failed: number;
  bytesOriginal: number;
  bytesOptimized: number;
  prodUrlUpdated: number;
  prodArrayUpdated: number;
  variacionesUpdated: number;
  orderItemsUpdated: number;
  storageDeleted: number;
}

const stats: MigrationStats = {
  totalFound: 0,
  toProcess: 0,
  processed: 0,
  skipped: 0,
  failed: 0,
  bytesOriginal: 0,
  bytesOptimized: 0,
  prodUrlUpdated: 0,
  prodArrayUpdated: 0,
  variacionesUpdated: 0,
  orderItemsUpdated: 0,
  storageDeleted: 0,
};

const BUCKET_NAME = 'productos';
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.avif', '.gif', '.bmp', '.tiff'];

async function listAllFiles(supabase: any, folder: string): Promise<FileToMigrate[]> {
  const result: FileToMigrate[] = [];
  let page = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, {
        limit,
        offset: page * limit,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error(`❌ Error al listar archivos en '${folder}':`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      // Ignorar carpetas virtuales
      if (!item.id && !item.metadata) continue;

      result.push({
        folder,
        name: item.name,
        size: item.metadata?.size || 0,
      });
    }

    if (data.length < limit) break;
    page++;
  }

  return result;
}

async function migrateImage(
  supabase: any,
  prisma: any,
  fileInfo: FileToMigrate,
  index: number,
  total: number
): Promise<void> {
  const { folder, name, size } = fileInfo;
  const oldPath = folder ? `${folder}/${name}` : name;
  const lastDot = name.lastIndexOf('.');
  const baseName = lastDot !== -1 ? name.substring(0, lastDot) : name;
  const newName = `${baseName}.webp`;
  const newPath = folder ? `${folder}/${newName}` : newName;

  const prefix = `[${index}/${total}]`;

  try {
    // 1. Descargar archivo original desde Supabase Storage
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(oldPath);

    if (downloadError || !blob) {
      throw new Error(`Error descargando ${oldPath}: ${downloadError?.message || 'Archivo no encontrado'}`);
    }

    const inputBuffer = Buffer.from(await blob.arrayBuffer());

    // 2. Transformar con sharp a WebP: máx 1200px ancho, calidad 80, conservando aspecto y rotación
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1200,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    const newSize = optimizedBuffer.length;
    const compressionRatio = (((size - newSize) / size) * 100).toFixed(1);

    // 3. Subir nuevo archivo WebP con cacheControl inmutable de 1 año (31536000)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newPath, optimizedBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Error subiendo WebP ${newPath}: ${uploadError.message}`);
    }

    // 4. Obtener URLs públicas
    const { data: oldUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(oldPath);
    const { data: newUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(newPath);
    const oldUrl = oldUrlData.publicUrl;
    const newUrl = newUrlData.publicUrl;

    // 5. Actualizar en Base de Datos de manera atómica y segura
    // 5.1 Producto.url_imagen
    const prodUrlRes = await prisma.producto.updateMany({
      where: {
        OR: [
          { url_imagen: oldUrl },
          { url_imagen: { endsWith: `/${name}` } },
        ],
      },
      data: { url_imagen: newUrl },
    });
    if (prodUrlRes.count > 0) {
      stats.prodUrlUpdated += prodUrlRes.count;
    }

    // 5.2 Producto.imagenes (Reemplazo en array)
    const rawResult = await prisma.$executeRawUnsafe(
      `UPDATE "Producto" SET imagenes = array_replace(imagenes, $1, $2) WHERE $1 = ANY(imagenes)`,
      oldUrl,
      newUrl
    );
    if (rawResult > 0) {
      stats.prodArrayUpdated += rawResult;
    }

    // 5.3 VariacionProducto.imagen
    const varRes = await prisma.variacionProducto.updateMany({
      where: {
        OR: [
          { imagen: oldUrl },
          { imagen: { endsWith: `/${name}` } },
        ],
      },
      data: { imagen: newUrl },
    });
    if (varRes.count > 0) {
      stats.variacionesUpdated += varRes.count;
    }

    // 5.4 ItemPedido.variacion_imagen
    const itemRes = await prisma.itemPedido.updateMany({
      where: {
        OR: [
          { variacion_imagen: oldUrl },
          { variacion_imagen: { endsWith: `/${name}` } },
        ],
      },
      data: { variacion_imagen: newUrl },
    });
    if (itemRes.count > 0) {
      stats.orderItemsUpdated += itemRes.count;
    }

    // 6. Eliminar archivo original pesado del bucket de Storage una vez asegurado todo
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([oldPath]);

    if (deleteError) {
      console.warn(`${prefix} ⚠️ Advertencia eliminando ${oldPath}: ${deleteError.message}`);
    } else {
      stats.storageDeleted++;
    }

    stats.processed++;
    stats.bytesOriginal += size;
    stats.bytesOptimized += newSize;

    const dbLogs: string[] = [];
    if (prodUrlRes.count) dbLogs.push(`Prod.url: +${prodUrlRes.count}`);
    if (rawResult) dbLogs.push(`Prod.imgs: +${rawResult}`);
    if (varRes.count) dbLogs.push(`Var.img: +${varRes.count}`);
    const dbSummary = dbLogs.length > 0 ? ` [DB: ${dbLogs.join(', ')}]` : '';

    console.log(
      `${prefix} ✅ ${name} -> ${newName} | ${(size / 1024).toFixed(0)}KB -> ${(newSize / 1024).toFixed(0)}KB (-${compressionRatio}%)${dbSummary}`
    );
  } catch (err: any) {
    stats.failed++;
    console.error(`${prefix} ❌ Error en ${name}:`, err.message || err);
  }
}

async function run() {
  console.log('================================================================');
  console.log('🚀 INICIANDO MIGRACIÓN DE IMÁGENES A WEBP & CACHÉ 1 AÑO (31536000)');
  console.log('================================================================');

  const { createServerClient } = await import('../lib/supabase-server');
  const { prisma } = await import('../lib/db');
  const supabase = createServerClient();

  // 1. Escanear bucket
  console.log('\n🔍 Escaneando archivos en el bucket "productos"...');
  const velasFiles = await listAllFiles(supabase, 'velas');
  const rootFiles = await listAllFiles(supabase, '');

  const allFiles = [...velasFiles, ...rootFiles];
  stats.totalFound = allFiles.length;

  // 2. Filtrar solo imágenes no-webp
  const filesToProcess = allFiles.filter(f => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    return ext !== '.webp' && IMAGE_EXTENSIONS.includes(ext);
  });

  stats.toProcess = filesToProcess.length;
  stats.skipped = allFiles.length - filesToProcess.length;

  console.log(`📁 Total de archivos encontrados: ${allFiles.length}`);
  console.log(`🎯 Archivos a procesar a WebP:   ${filesToProcess.length}`);
  console.log(`⏭️  Archivos omitidos:            ${stats.skipped}\n`);

  if (filesToProcess.length === 0) {
    console.log('✅ No hay imágenes pendientes de migrar. Todo está optimizado en WebP.');
    await prisma.$disconnect();
    return;
  }

  const startTime = Date.now();

  // 3. Ejecutar con concurrencia controlada (5 archivos simultáneos)
  const CONCURRENCY = 5;
  for (let i = 0; i < filesToProcess.length; i += CONCURRENCY) {
    const chunk = filesToProcess.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map((file, chunkIdx) =>
        migrateImage(supabase, prisma, file, i + chunkIdx + 1, filesToProcess.length)
      )
    );
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  // 4. Reporte final
  console.log('\n================================================================');
  console.log('📊 REPORTE DE RESULTADOS DE LA MIGRACIÓN');
  console.log('================================================================');
  console.log(`Tiempo total de ejecución:        ${durationSec}s`);
  console.log(`Archivos encontrados en Storage:  ${stats.totalFound}`);
  console.log(`Archivos procesados exitosamente: ${stats.processed} / ${stats.toProcess}`);
  console.log(`Archivos con fallo:               ${stats.failed}`);
  console.log(`Archivos originales eliminados:   ${stats.storageDeleted}`);
  console.log('----------------------------------------------------------------');
  console.log(`Peso original total:              ${(stats.bytesOriginal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Peso optimizado total:            ${(stats.bytesOptimized / (1024 * 1024)).toFixed(2)} MB`);
  const totalSaved = stats.bytesOriginal - stats.bytesOptimized;
  const percentSaved = stats.bytesOriginal > 0 ? ((totalSaved / stats.bytesOriginal) * 100).toFixed(1) : '0';
  console.log(`Espacio neto ahorrado:            ${(totalSaved / (1024 * 1024)).toFixed(2)} MB (${percentSaved}% de reducción)`);
  console.log('----------------------------------------------------------------');
  console.log(`Campos Producto.url_imagen:       ${stats.prodUrlUpdated} actualizados`);
  console.log(`Registros Producto.imagenes:      ${stats.prodArrayUpdated} actualizados`);
  console.log(`Campos Variacion.imagen:          ${stats.variacionesUpdated} actualizados`);
  console.log(`Campos ItemPedido.variacion:      ${stats.orderItemsUpdated} actualizados`);
  console.log('================================================================\n');

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error('Fatal migration error:', e);
  process.exit(1);
});
