import { z } from 'zod';

export const CATEGORIAS_FAQ_PREDEFINIDAS = [
  'General',
  'Cuidado de Velas',
  'Jabones Artesanales',
  'Envíos y Entregas',
  'Pagos y Pedidos',
  'Personalizados y Mayoristas',
] as const;

export const faqBaseSchema = z.object({
  pregunta: z
    .string()
    .trim()
    .min(3, 'La pregunta debe tener al menos 3 caracteres')
    .max(500, 'La pregunta no puede exceder 500 caracteres'),
  respuesta: z
    .string()
    .trim()
    .min(5, 'La respuesta debe tener al menos 5 caracteres')
    .max(5000, 'La respuesta no puede exceder 5000 caracteres'),
  categoria: z
    .string()
    .trim()
    .min(1, 'La categoría no puede estar vacía')
    .max(100, 'La categoría no puede exceder 100 caracteres')
    .default('General'),
  orden: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
      return isNaN(num) || num < 0 ? 0 : num;
    })
    .default(0),
  activo: z.boolean().default(true),
});

export const crearFaqSchema = faqBaseSchema;

export const actualizarFaqSchema = faqBaseSchema.partial().extend({
  pregunta: z.string().trim().min(3).max(500).optional(),
  respuesta: z.string().trim().min(5).max(5000).optional(),
  categoria: z.string().trim().min(1).max(100).optional(),
  orden: z
    .union([z.number(), z.string()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
      return isNaN(num) || num < 0 ? 0 : num;
    })
    .optional(),
  activo: z.boolean().optional(),
});

export const reorderFaqItemSchema = z.object({
  id: z.string().min(1, 'El ID es obligatorio'),
  orden: z.number().int().min(0, 'El orden debe ser un número entero mayor o igual a 0'),
});

export const reorderFaqsSchema = z.object({
  items: z.array(reorderFaqItemSchema).min(1, 'Debe enviar al menos un elemento para reordenar'),
});

export type FAQBaseInput = z.infer<typeof faqBaseSchema>;
export type CrearFAQInput = z.infer<typeof crearFaqSchema>;
export type ActualizarFAQInput = z.infer<typeof actualizarFaqSchema>;
export type ReorderFaqsInput = z.infer<typeof reorderFaqsSchema>;
