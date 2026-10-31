import { z } from 'zod';

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const createCashMovementSchema = z.object({
  direction: z.enum(['income', 'expense'], { error: 'Selecciona ingreso o egreso' }),
  // { error } en el z.string() base (no solo en .min()): sin esto, el campo
  // sin tocar (undefined) fallaba con el mensaje crudo de Zod "Invalid
  // input: expected string, received undefined" antes de llegar siquiera a
  // .min() (bug reportado por QA).
  category: z.string({ error: 'Selecciona una categoría' }).min(1, 'Selecciona una categoría').max(50, 'Máximo 50 caracteres'),
  amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  occurred_at: z
    .string({ error: 'La fecha es obligatoria' })
    .min(1, 'La fecha es obligatoria')
    // El selector ya bloquea fechas futuras (disableFuture), pero el
    // schema es la última línea de defensa si llegara un valor fuera de
    // ese calendario (bug reportado por QA: se podían guardar movimientos
    // con fecha de 2027).
    .refine((value) => new Date(value).getTime() <= startOfToday().getTime(), {
      message: 'La fecha no puede ser una fecha futura',
    }),
  // Solo la elige el Super Administrador (ver CompanyStoreFields).
  company_id: z.number().optional(),
  quotation_id: z.number().optional(),
  purchase_order_id: z.number().optional(),
  business_unit_id: z.number().optional(),
  // null = efectivo (sin cuenta).
  payment_account_id: z.number().nullable().optional(),
});

export type CreateCashMovementFormValues = z.infer<typeof createCashMovementSchema>;
