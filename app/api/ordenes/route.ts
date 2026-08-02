export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || searchParams.get('q');
  const estadoEnvio = searchParams.get('estado_envio');
  const estadoPago = searchParams.get('estado_pago');
  const ciudad = searchParams.get('ciudad');
  const page = parseInt(searchParams.get('page') ?? '1');
  const limit = 20;

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const whereClause: any = {
      ...(estadoEnvio ? { estado_envio: estadoEnvio } : {}),
      ...(estadoPago ? { estado_pago: estadoPago } : {}),
      ...(ciudad ? { ciudad: { contains: ciudad, mode: 'insensitive' as const } } : {}),
    };

    if (search && search.trim() !== '') {
      const q = search.trim();
      whereClause.OR = [
        { id: { contains: q, mode: 'insensitive' as const } },
        { id_transaccion_wompi: { contains: q, mode: 'insensitive' as const } },
        { cliente_nombre: { contains: q, mode: 'insensitive' as const } },
        { cliente_email: { contains: q, mode: 'insensitive' as const } },
        { cliente_telefono: { contains: q, mode: 'insensitive' as const } },
      ];
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const [pedidos, total] = await Promise.all([
      prisma.pedido.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              producto: {
                select: { nombre: true, url_imagen: true },
              },
            },
          },
        },
        orderBy: { creado_en: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.pedido.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({ pedidos, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 });
  }
}

