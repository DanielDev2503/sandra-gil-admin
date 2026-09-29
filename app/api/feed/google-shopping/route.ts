export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function escapeXml(unsafe: string = ''): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(field: string = ''): string {
  const stringValue = String(field ?? '');
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

// 40 columnas oficiales de la plantilla de Google Merchant Center
const GOOGLE_MERCHANT_CSV_HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'availability_date',
  'expiration_date',
  'link',
  'mobile_link',
  'image_link',
  'price',
  'sale_price',
  'sale_price_effective_date',
  'identifier_exists',
  'gtin',
  'mpn',
  'brand',
  'product_highlight',
  'product_detail',
  'additional_image_link',
  'condition',
  'adult',
  'color',
  'size',
  'size_type',
  'size_system',
  'gender',
  'material',
  'pattern',
  'age_group',
  'multipack',
  'is bundle',
  'unit_pricing_measure',
  'unit_pricing_base_measure',
  'energy_efficiency_class',
  'min_energy_efficiency_class',
  'max_energy_efficiency',
  'item_group_id',
  'video_link',
  'virtual_model_link',
  'cost_of_goods_sold',
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'xml';
    // Si variants=false o variantes=false, genera sólo 1 fila por producto base (63 productos)
    const includeVariants =
      searchParams.get('variants') !== 'false' &&
      searchParams.get('variantes') !== 'false';

    const storeUrl =
      process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, '') || 'https://sandragilvelas.com';

    // Obtener ÚNICAMENTE productos activos (excluyendo inactivos)
    const productos = await prisma.producto.findMany({
      where: { activo: true },
      include: {
        variaciones: {
          where: { activo: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    type FeedItem = {
      id: string; // Máximo 50 caracteres (Google estricto)
      title: string; // Máximo 150 caracteres
      description: string; // Máximo 5000 caracteres
      link: string;
      imageLink: string;
      additionalImages: string[];
      availability: 'in_stock' | 'out_of_stock' | 'preorder';
      price: string;
      brand: string;
      condition: string;
      identifierExists: string;
      googleProductCategory: string;
      productType: string;
      material: string;
      itemGroupId?: string; // Máximo 50 caracteres
    };

    const items: FeedItem[] = [];

    for (const prod of productos) {
      const rawPrice = prod.precio ?? 0;
      const formattedBasePrice = `${rawPrice.toFixed(2)} COP`;
      const availability: 'in_stock' | 'out_of_stock' | 'preorder' = prod.esBajoPedido
        ? 'preorder'
        : prod.stock > 0
        ? 'in_stock'
        : 'out_of_stock';

      const mainImage =
        prod.url_imagen ||
        (prod.imagenes && prod.imagenes.length > 0 ? prod.imagenes[0] : '');

      const additionalImages = (prod.imagenes || []).filter(
        (img) => img && img !== mainImage
      );

      const productLink = `${storeUrl}/catalogo/${prod.slug}`;
      const isCandle = prod.tipo === 'VELA';

      // 2082 = Velas, 2571 = Jabones
      const googleProductCategory = isCandle ? '2082' : '2571';
      const productType = isCandle
        ? 'Hogar y Decoración > Velas y Aromas > Velas Aromáticas'
        : 'Salud y Belleza > Cuidado Personal > Jabones Artesanales';

      // Limpiar descripción sin saltos de línea para no romper el CSV en Google Sheets
      const cleanDescription = (prod.descripcion || prod.nombre)
        .replace(/[\r\n]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 5000);

      const cleanMaterial = (prod.material || 'Cera de soya vegetal')
        .replace(/[\r\n]+/g, ' ')
        .trim();

      const activeVariations = prod.variaciones || [];

      // Si tiene variaciones y está habilitado el desglose por variantes
      if (includeVariants && activeVariations.length > 0) {
        for (const variacion of activeVariations) {
          const varPrice = variacion.precio ?? rawPrice;
          const varFormattedPrice = `${varPrice.toFixed(2)} COP`;
          const varImage = variacion.imagen || mainImage;
          const varTitle = `${prod.nombre} - ${variacion.nombre}`
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 150);

          items.push({
            // El ID debe ser <= 50 caracteres. Usamos variacion.id (36 caracteres UUID)
            id: variacion.id.slice(0, 50),
            // item_group_id asocia todas las variantes al producto padre (36 caracteres UUID <= 50)
            itemGroupId: prod.id.slice(0, 50),
            title: varTitle,
            description: cleanDescription,
            link: productLink,
            imageLink: varImage,
            additionalImages,
            availability,
            price: varFormattedPrice,
            brand: 'Sandra Gil Velas',
            condition: 'new',
            identifierExists: 'no',
            googleProductCategory,
            productType,
            material: cleanMaterial,
          });
        }
      } else {
        // Producto base individual (ID <= 50 caracteres)
        const baseTitle = prod.nombre
          .replace(/[\r\n]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 150);

        items.push({
          id: prod.id.slice(0, 50),
          title: baseTitle,
          description: cleanDescription,
          link: productLink,
          imageLink: mainImage,
          additionalImages,
          availability,
          price: formattedBasePrice,
          brand: 'Sandra Gil Velas',
          condition: 'new',
          identifierExists: 'no',
          googleProductCategory,
          productType,
          material: cleanMaterial,
        });
      }
    }

    // 1. Respuesta en formato CSV (40 columnas alineadas exactamente con Google Sheets / Google Merchant)
    if (format === 'csv') {
      const csvRows = [GOOGLE_MERCHANT_CSV_HEADERS.join(',')];

      for (const item of items) {
        const row = [
          escapeCsv(item.id), // id (máx 50)
          escapeCsv(item.title), // title (máx 150)
          escapeCsv(item.description), // description (máx 5000)
          escapeCsv(item.availability), // availability
          '', // availability_date
          '', // expiration_date
          escapeCsv(item.link), // link
          '', // mobile_link
          escapeCsv(item.imageLink), // image_link
          escapeCsv(item.price), // price
          '', // sale_price
          '', // sale_price_effective_date
          escapeCsv(item.identifierExists), // identifier_exists
          '', // gtin
          '', // mpn
          escapeCsv(item.brand), // brand
          '', // product_highlight
          '', // product_detail
          escapeCsv(item.additionalImages.join(',')), // additional_image_link
          escapeCsv(item.condition), // condition
          'no', // adult
          '', // color
          '', // size
          '', // size_type
          '', // size_system
          '', // gender
          escapeCsv(item.material), // material
          '', // pattern
          '', // age_group
          '', // multipack
          '', // is bundle
          '', // unit_pricing_measure
          '', // unit_pricing_base_measure
          '', // energy_efficiency_class
          '', // min_energy_efficiency_class
          '', // max_energy_efficiency
          escapeCsv(item.itemGroupId || ''), // item_group_id (máx 50)
          '', // video_link
          '', // virtual_model_link
          '', // cost_of_goods_sold
        ];
        csvRows.push(row.join(','));
      }

      return new NextResponse(csvRows.join('\n'), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'inline; filename="google-merchant-feed.csv"',
          'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
        },
      });
    }

    // 2. Respuesta en formato XML RSS 2.0 (estándar oficial de Google Merchant Center)
    const xmlItems = items
      .map((item) => {
        const additionalImagesXml = item.additionalImages
          .map((img) => `      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`)
          .join('\n');

        const itemGroupXml = item.itemGroupId
          ? `\n      <g:item_group_id>${escapeXml(item.itemGroupId)}</g:item_group_id>`
          : '';

        return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.imageLink)}</g:image_link>${additionalImagesXml ? '\n' + additionalImagesXml : ''}
      <g:availability>${item.availability}</g:availability>
      <g:price>${item.price}</g:price>
      <g:brand>${escapeXml(item.brand)}</g:brand>
      <g:condition>${item.condition}</g:condition>
      <g:identifier_exists>${item.identifierExists}</g:identifier_exists>
      <g:google_product_category>${item.googleProductCategory}</g:google_product_category>
      <g:product_type>${escapeXml(item.productType)}</g:product_type>
      <g:material>${escapeXml(item.material)}</g:material>${itemGroupXml}
    </item>`;
      })
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Sandra Gil Velas - Catálogo de Productos</title>
    <link>${escapeXml(storeUrl)}</link>
    <description>Catálogo oficial de productos para Google Merchant Center</description>
${xmlItems}
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('Error generando feed para Google Merchant:', error);
    return NextResponse.json(
      { error: 'Error interno generando feed de Google Merchant' },
      { status: 500 }
    );
  }
}
