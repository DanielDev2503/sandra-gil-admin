export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULTS = {
  id: 'default',
  promptGenerador: `Eres un experto en marketing y copywriting para una marca artesanal de velas decorativas y aromáticas llamada "Sandra Gil". 
Genera un JSON con los siguientes campos basándote en la imagen y descripción proporcionada:
- "nombre": Un título comercial atractivo, elegante y que evoque emociones (máximo 60 caracteres)
- "descripcion": Una descripción profesional orientada a ventas (CRO), que destaque beneficios sensoriales, ambientación y calidad artesanal (150-250 palabras)
- "aroma": El aroma principal sugerido basado en la apariencia y descripción
- "material": El material principal sugerido (ej: Cera de Soya, Cera de Abeja, Blend Artesanal)
RESPONDE SOLO CON EL JSON, sin markdown ni texto adicional.`,
  promptImagen: `Genera una fotografía profesional de producto de una vela artesanal decorativa para e-commerce. 
La vela debe verse elegante, premium y artesanal. Fondo neutro minimalista o superficie de madera/piedra natural.
Iluminación suave y cálida tipo estudio fotográfico. Estilo editorial de catálogo de lujo.
Basado en esta descripción del producto: `,
  temperatura: 0.7,
  modelo: 'gemini-2.0-flash',
};

export async function GET() {
  try {
    const config = await prisma.configuracionIA.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json(config ?? DEFAULTS);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { promptGenerador, promptImagen, temperatura, modelo } = body;

    const config = await prisma.configuracionIA.upsert({
      where: { id: 'default' },
      update: {
        ...(promptGenerador !== undefined ? { promptGenerador } : {}),
        ...(promptImagen !== undefined ? { promptImagen } : {}),
        ...(temperatura !== undefined ? { temperatura: parseFloat(String(temperatura)) } : {}),
        ...(modelo !== undefined ? { modelo } : {}),
      },
      create: {
        id: 'default',
        promptGenerador: promptGenerador ?? DEFAULTS.promptGenerador,
        promptImagen: promptImagen ?? DEFAULTS.promptImagen,
        temperatura: temperatura ?? DEFAULTS.temperatura,
        modelo: modelo ?? DEFAULTS.modelo,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error saving AI config:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 }
    );
  }
}
