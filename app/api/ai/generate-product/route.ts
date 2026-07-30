export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '@/lib/db';
import { createServerClient } from '@/lib/supabase-server';
import { applyWatermark } from '@/lib/watermark';

const DEFAULT_PROMPT_GENERADOR = `Eres un experto en marketing y copywriting para una marca artesanal de velas decorativas y aromáticas llamada "Sandra Gil". 
Genera un JSON con los siguientes campos basándote en la imagen y descripción proporcionada:
- "nombre": Un título comercial atractivo, elegante y que evoque emociones (máximo 60 caracteres)
- "descripcion": Una descripción profesional orientada a ventas (CRO), que destaque beneficios sensoriales, ambientación y calidad artesanal (150-250 palabras)
- "aroma": El aroma principal sugerido basado en la apariencia y descripción
- "material": El material principal sugerido (ej: Cera de Soya, Cera de Abeja, Blend Artesanal)
RESPONDE SOLO CON EL JSON, sin markdown ni texto adicional.`;

const DEFAULT_PROMPT_IMAGEN = `Genera una fotografía profesional de producto de una vela artesanal decorativa para e-commerce. 
La vela debe verse elegante, premium y artesanal. Fondo neutro minimalista o superficie de madera/piedra natural.
Iluminación suave y cálida tipo estudio fotográfico. Estilo editorial de catálogo de lujo.
Basado en esta descripción del producto: `;

async function getAIConfig() {
  try {
    const config = await prisma.configuracionIA.findUnique({
      where: { id: 'default' },
    });
    return config;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY no configurada en el servidor' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { foto, descripcion } = body as { foto?: string; descripcion: string };

    if (!descripcion) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      );
    }

    const config = await getAIConfig();
    const promptGenerador = config?.promptGenerador || DEFAULT_PROMPT_GENERADOR;
    const promptImagen = config?.promptImagen || DEFAULT_PROMPT_IMAGEN;
    const temperatura = config?.temperatura ?? 0.7;
    let modelo = config?.modelo || 'gemini-2.0-flash';
    if (modelo.includes('2.5')) {
      modelo = modelo.replace('2.5', '2.0');
    }

    const ai = new GoogleGenAI({ apiKey });

    // ── Step 1: Generate text (nombre, descripcion, aroma, material) ──
    const textParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: `${promptGenerador}\n\nDescripción del usuario: "${descripcion}"` },
    ];

    // If a draft photo was provided, include it
    if (foto) {
      // foto comes as a data URI: "data:image/jpeg;base64,..."
      const match = foto.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        textParts.unshift({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }

    const textResponse = await ai.models.generateContent({
      model: modelo,
      contents: [{ role: 'user', parts: textParts }],
      config: {
        temperature: temperatura,
        responseMimeType: 'application/json',
      },
    });

    let textoGenerado: { nombre: string; descripcion: string; aroma: string; material: string };
    try {
      const rawText = textResponse.text ?? '{}';
      textoGenerado = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: 'Error al parsear la respuesta de texto de Gemini' },
        { status: 500 }
      );
    }

    // ── Step 2: Generate 4 product images ──
    const imagenes: string[] = [];
    const supabase = createServerClient();

    const imagePromises = Array.from({ length: 4 }, async (_, i) => {
      try {
        const variantes = [
          'vista frontal, fondo blanco minimalista',
          'vista en ángulo 3/4, sobre superficie de madera',
          'vista cenital, rodeada de elementos decorativos naturales',
          'vista de detalle, con la llama encendida en ambiente acogedor',
        ];

        const fullPrompt = `${promptImagen}${descripcion}. ${variantes[i]}. Nombre del producto: "${textoGenerado.nombre}". Aroma: ${textoGenerado.aroma}.`;

        const imgResponse = await ai.models.generateContent({
          model: modelo,
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          config: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: temperatura,
          },
        });

        // Extract image data from response
        const parts = imgResponse.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            const ext = mimeType.includes('jpeg') ? 'jpg' : 'png';
            const fileName = `velas/ai-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

            // Convert base64 to buffer and apply watermark
            const originalBuffer = Buffer.from(part.inlineData.data, 'base64');
            const buffer = await applyWatermark(originalBuffer);

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('productos')
              .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage
                .from('productos')
                .getPublicUrl(fileName);
              return urlData.publicUrl;
            } else {
              console.error(`Error uploading AI image ${i}:`, uploadError.message);
            }
            break; // only take first image from response
          }
        }
        return null;
      } catch (err) {
        console.error(`Error generating image ${i}:`, err);
        return null;
      }
    });

    const results = await Promise.all(imagePromises);
    for (const url of results) {
      if (url) imagenes.push(url);
    }

    return NextResponse.json({
      texto: textoGenerado,
      imagenes,
    });
  } catch (error: any) {
    console.error('AI generate-product error:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al generar con IA' },
      { status: 500 }
    );
  }
}
