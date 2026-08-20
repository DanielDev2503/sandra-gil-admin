import { z } from 'zod';

export const variacionProductoSchema = z.object({
  id: z.string().optional(),
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre de la variación no puede estar vacío')
    .max(120, 'El nombre de la variación no puede exceder 120 caracteres'),
  imagen: z
    .string()
    .trim()
    .min(1, 'La URL de la imagen de variación es obligatoria'),
  precio: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num < 0) return null;
      return num;
    })
    .optional(),
  activo: z.boolean().default(true),
});

export const productoBaseSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'La descripción no puede estar vacía'),
  tipo: z.enum(['VELA', 'JABON'] as const, {
    message: 'El tipo debe ser VELA o JABON',
  }).default('VELA'),
  aroma: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  aromaId: z
    .string()
    .nullable()
    .optional(),
  material: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  materialId: z
    .string()
    .nullable()
    .optional(),
  dimensiones: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  precio: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return null;
      return num;
    })
    .refine((val) => val === null || val >= 0, {
      message: 'El precio debe ser un número positivo',
    }),
  stock: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
      if (isNaN(num) || num < 0) return 0;
      return num;
    })
    .default(0),
  esBajoPedido: z.boolean().default(false),
  url_imagen: z
    .string()
    .trim()
    .min(1, 'La URL de la imagen principal no puede estar vacía'),
  imagenes: z
    .array(z.string().trim())
    .default([])
    .transform((imgs) => imgs.filter((img) => typeof img === 'string' && img.trim().length > 0)),
  activo: z.boolean().default(true),
  variaciones: z.array(variacionProductoSchema).default([]),
});

export const crearProductoSchema = productoBaseSchema.transform((data) => {
  const isJabon = data.tipo === 'JABON';
  const isBajoPedido = data.esBajoPedido === true;

  // Sincronizar array de imágenes con url_imagen
  let syncImagenes = Array.from(new Set([data.url_imagen, ...data.imagenes])).filter(Boolean);
  if (syncImagenes.length === 0 && data.url_imagen) {
    syncImagenes = [data.url_imagen];
  }

  const validVariaciones = isBajoPedido
    ? []
    : data.variaciones.filter((v) => v.nombre.trim() !== '' && v.imagen.trim() !== '');

  return {
    ...data,
    aroma: isJabon ? null : data.aroma,
    aromaId: isJabon ? null : data.aromaId,
    material: isJabon ? null : data.material,
    materialId: isJabon ? null : data.materialId,
    imagenes: syncImagenes,
    variaciones: validVariaciones,
  };
});

export const actualizarProductoSchema = productoBaseSchema.partial().extend({
  nombre: z.string().trim().min(2).max(150).optional(),
  descripcion: z.string().trim().min(1).optional(),
  tipo: z.enum(['VELA', 'JABON'] as const).optional(),
  url_imagen: z.string().trim().min(1).optional(),
  stock: z.union([z.number(), z.string()]).transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
    return isNaN(num) || num < 0 ? 0 : num;
  }).optional(),
  precio: z.union([z.number(), z.string(), z.null()]).transform((val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) || num < 0 ? null : num;
  }).optional(),
  variaciones: z.array(variacionProductoSchema).optional(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
