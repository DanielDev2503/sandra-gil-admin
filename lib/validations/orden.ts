import { z } from 'zod';

export const ESTADOS_ENVIO_VALIDOS = ['PENDING', 'APPROVED', 'SHIPPED', 'DELIVERED', 'DECLINED'] as const;
export const ESTADOS_PAGO_VALIDOS = ['pendiente', 'pagado', 'fallido', 'anulado', 'PENDING', 'APPROVED', 'DECLINED', 'VOIDED'] as const;

export const actualizarOrdenSchema = z.object({
  estado_envio: z
    .enum(ESTADOS_ENVIO_VALIDOS, {
      message: 'Estado de envío inválido. Debe ser PENDING, APPROVED, SHIPPED, DELIVERED o DECLINED',
    })
    .optional(),
  numero_guia: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  notas_admin: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export type ActualizarOrdenInput = z.infer<typeof actualizarOrdenSchema>;
