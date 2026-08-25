export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria')?.trim();

    const where: any = {
      activo: true,
    };

    if (categoria && categoria !== 'TODAS') {
      where.categoria = { equals: categoria, mode: 'insensitive' };
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        pregunta: true,
        respuesta: true,
        categoria: true,
        orden: true,
      },
    });

    return NextResponse.json(faqs, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error('Error en API pública de FAQ:', error);
    return NextResponse.json(
      { error: 'Error al consultar preguntas frecuentes' },
      { status: 500 }
    );
  }
}
