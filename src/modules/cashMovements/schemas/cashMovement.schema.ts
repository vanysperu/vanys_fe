import { z } from 'zod';

export const createCashMovementSchema = z.object({
  direction: z.enum(['income', 'expense'], { error: 'Selecciona ingreso o egreso' }),
  category: z.string().min(1, 'Selecciona una categoría').max(50, 'Máximo 50 caracteres'),
  amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  occurred_at: z.string().min(1, 'La fecha es obligatoria'),
  quotation_id: z.number().optional(),
  purchase_order_id: z.number().optional(),
  business_unit_id: z.number().optional(),
  // null = efectivo (sin cuenta).
  payment_account_id: z.number().nullable().optional(),
});

export type CreateCashMovementFormValues = z.infer<typeof createCashMovementSchema>;
