export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { reorderFaqsSchema } from '@/lib/validations/faq';
import { revalidatePath } from 'next/cache';

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const validation = reorderFaqsSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || 'Datos de reordenamiento inválidos';
      return NextResponse.json(
        { error: firstError, details: validation.error.issues },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Ejecución atómica en PostgreSQL mediante transacción
    await prisma.$transaction(
      items.map((item) =>
        prisma.fAQ.update({
          where: { id: item.id },
          data: { orden: item.orden },
        })
      )
    );

    revalidatePath('/admin/faq');
    revalidatePath('/faq');

    return NextResponse.json({ success: true, message: 'Orden actualizado correctamente' });
  } catch (error: any) {
    console.error('Error al reordenar FAQs:', error);
    return NextResponse.json(
      { error: error?.message || 'Error al actualizar el orden de las preguntas' },
      { status: 500 }
    );
  }
}
