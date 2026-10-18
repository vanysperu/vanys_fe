import { z } from 'zod';

export const CASH_PAYMENT_METHOD = 'cash';

export const updatePaymentSchema = z
  .object({
    amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
    method: z.string().min(1, 'Selecciona un método de pago').max(50, 'Máximo 50 caracteres'),
    paid_at: z.string().min(1, 'La fecha es obligatoria'),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
    operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
    // Cuenta a la que entró (null = efectivo); ver QuotationPaymentsSection.
    payment_account_id: z.number().nullable().optional(),
  })
  .refine((values) => values.method === CASH_PAYMENT_METHOD || Boolean(values.operation_number), {
    message: 'El número de operación es obligatorio para pagos que no son en efectivo',
    path: ['operation_number'],
  });

export type UpdatePaymentFormValues = z.infer<typeof updatePaymentSchema>;
