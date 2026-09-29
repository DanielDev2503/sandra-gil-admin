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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format')?.toLowerCase() || 'xml';
    const storeUrl =
      process.env.NEXT_PUBLIC_STORE_URL?.replace(/\/$/, '') || 'https://sandragilvelas.com';

    // Obtener productos activos con sus variaciones
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
      id: string;
      title: string;
      description: string;
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
      itemGroupId?: string;
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

      // Categorías de taxonomía de Google Merchant
      // 2082: Hogar y jardín > Decoración > Fragancias para el hogar > Velas
      // 2571: Salud y belleza > Cuidado personal > Cosméticos > Baño y cuerpo > Jabones en barra
      const googleProductCategory = isCandle ? '2082' : '2571';
      const productType = isCandle
        ? 'Hogar y Decoración > Velas y Aromas > Velas Aromáticas'
        : 'Salud y Belleza > Cuidado Personal > Jabones Artesanales';

      const cleanDescription = (prod.descripcion || prod.nombre)
        .replace(/\s+/g, ' ')
        .trim();

      // Si tiene variaciones activas, exportar cada variante vinculada con item_group_id
      if (prod.variaciones && prod.variaciones.length > 0) {
        for (const variacion of prod.variaciones) {
          const varPrice = variacion.precio ?? rawPrice;
          const varFormattedPrice = `${varPrice.toFixed(2)} COP`;
          const varImage = variacion.imagen || mainImage;

          items.push({
            id: `${prod.id}_${variacion.id}`,
            itemGroupId: prod.id,
            title: `${prod.nombre} - ${variacion.nombre}`,
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
            material: prod.material || 'Cera de soya vegetal',
          });
        }
      } else {
        // Producto base individual
        items.push({
          id: prod.id,
          title: prod.nombre,
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
          material: prod.material || 'Cera de soya vegetal',
        });
      }
    }

    // 1. Respuesta en formato CSV (para Google Sheets =IMPORTDATA o descarga manual)
    if (format === 'csv') {
      const headers = [
        'id',
        'title',
        'description',
        'availability',
        'link',
        'image_link',
        'price',
        'brand',
        'condition',
        'identifier_exists',
        'google_product_category',
        'product_type',
        'material',
        'additional_image_link',
        'item_group_id',
      ];

      const csvRows = [headers.join(',')];

      for (const item of items) {
        const row = [
          escapeCsv(item.id),
          escapeCsv(item.title),
          escapeCsv(item.description),
          escapeCsv(item.availability),
          escapeCsv(item.link),
          escapeCsv(item.imageLink),
          escapeCsv(item.price),
          escapeCsv(item.brand),
          escapeCsv(item.condition),
          escapeCsv(item.identifierExists),
          escapeCsv(item.googleProductCategory),
          escapeCsv(item.productType),
          escapeCsv(item.material),
          escapeCsv(item.additionalImages.join(',')),
          escapeCsv(item.itemGroupId || ''),
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
    <description>Catálogo automatizado de Velas Aromáticas y Jabones Artesanales para Google Merchant Center</description>
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
