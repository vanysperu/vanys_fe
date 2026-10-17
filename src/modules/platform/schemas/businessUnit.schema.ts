import { z } from 'zod';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
// Código de tienda: alfanumérico + guion/guion bajo (es un código, no un
// nombre propio) — mismo criterio que el backend.
const BUSINESS_CODE_REGEX = /^[A-Za-z0-9_-]+$/;
// Color hexadecimal de 6 dígitos ("#RRGGBB").
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// Mismo shape que valida el backend (grulla_be: business_unit validators).
export const createBusinessUnitSchema = z
  .object({
    business_code: z
      .string()
      .min(1, 'El código de tienda es obligatorio')
      .max(255, 'Máximo 255 caracteres')
      .regex(BUSINESS_CODE_REGEX, 'El código de tienda solo puede tener letras, números, guiones y guion bajo'),
    company_id: z.number().int().positive('Selecciona una empresa'),
    address: z.string().max(255, 'Máximo 255 caracteres').optional(),
    primary_color: z.string().regex(HEX_COLOR_REGEX, 'El color debe ser hexadecimal (#RRGGBB)').optional(),
    secondary_color: z.string().regex(HEX_COLOR_REGEX, 'El color debe ser hexadecimal (#RRGGBB)').optional(),
    // Horario de atención (pedido explícito del usuario): días laborales +
    // hora de apertura/cierre. `working_days` se maneja como array en el
    // formulario (checkboxes) y se serializa a "1,2,3" recién al enviar.
    working_days: z.array(z.number().int().min(1).max(7)).optional(),
    opens_at: z.string().regex(TIME_REGEX, 'Formato HH:mm').optional().or(z.literal('')),
    closes_at: z.string().regex(TIME_REGEX, 'Formato HH:mm').optional().or(z.literal('')),
  })
  .refine((data) => !data.opens_at || !data.closes_at || data.opens_at < data.closes_at, {
    message: 'La hora de apertura debe ser menor que la hora de cierre',
    path: ['closes_at'],
  });

export type CreateBusinessUnitFormValues = z.infer<typeof createBusinessUnitSchema>;
