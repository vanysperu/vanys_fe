import { z } from 'zod';

import { moneyAmountSchema } from '@/lib/moneySchema';
import { createCashMovementSchema } from '@/modules/cashMovements/schemas/cashMovement.schema';

// Préstamo (21-nov). La fecha sigue la regla de Caja (no futura); el
// vencimiento es opcional y no puede ser antes del préstamo.
export const loanSchema = z
  .object({
    company_id: z.number().optional(),
    business_unit_id: z.number().optional(),
    borrower_name: z.string().trim().min(1, 'Escribe a quién se le prestó').max(150, 'Máximo 150 caracteres'),
    borrower_document: z.string().max(20, 'Máximo 20 caracteres').optional(),
    borrower_phone: z.string().max(20, 'Máximo 20 caracteres').optional(),
    principal: moneyAmountSchema('El monto prestado es obligatorio'),
    interest_rate: z
      .number({ error: 'Indica el interés (0 si no se cobra)' })
      .min(0, 'No puede ser negativo')
      .max(1000, 'Máximo 1000%'),
    loaned_at: createCashMovementSchema.shape.occurred_at,
    due_date: z.string().optional(),
    payment_account_id: z.number().nullable().optional(),
    operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
  })
  .refine((data) => !data.due_date || data.due_date >= data.loaned_at, {
    message: 'El vencimiento no puede ser antes del préstamo',
    path: ['due_date'],
  });

export type LoanFormValues = z.infer<typeof loanSchema>;

export const loanPaymentSchema = z.object({
  amount: moneyAmountSchema('El monto cobrado es obligatorio'),
  paid_at: createCashMovementSchema.shape.occurred_at,
  payment_account_id: z.number().nullable().optional(),
  operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

export type LoanPaymentFormValues = z.infer<typeof loanPaymentSchema>;
