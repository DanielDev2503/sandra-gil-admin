export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { crearFaqSchema } from '@/lib/validations/faq';
import { revalidatePath } from 'next/cache';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const categoria = searchParams.get('categoria')?.trim() ?? '';
    const activo = searchParams.get('activo');

    const where: any = {};

    if (search) {
      where.OR = [
        { pregunta: { contains: search, mode: 'insensitive' } },
        { respuesta: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoria && categoria !== 'TODAS') {
      where.categoria = { equals: categoria, mode: 'insensitive' };
    }

    if (activo !== null && activo !== undefined && activo !== '') {
      where.activo = activo === 'true';
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(faqs);
  } catch (error: any) {
    console.error('Error al obtener FAQs en admin:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al obtener preguntas frecuentes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validation = crearFaqSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos de FAQ inválidos';
      return NextResponse.json(
        { error: firstError, details: validation.error.issues },
        { status: 400 }
      );
    }

    const { pregunta, respuesta, categoria, activo } = validation.data;
    let orden = validation.data.orden;

    // Si orden no viene especificado o es 0 y hay otros registros, calculamos el siguiente orden
    if (orden === 0) {
      const highestOrderFaq = await prisma.fAQ.findFirst({
        orderBy: { orden: 'desc' },
        select: { orden: true },
      });
      orden = (highestOrderFaq?.orden ?? -1) + 1;
    }

    const faq = await prisma.fAQ.create({
      data: {
        pregunta,
        respuesta,
        categoria: categoria.trim() || 'General',
        orden,
        activo: activo ?? true,
      },
    });

    revalidatePath('/admin/faq');
    revalidatePath('/faq');

    return NextResponse.json(faq, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear FAQ:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al crear la pregunta frecuente' },
      { status: 500 }
    );
  }
}
