import { z } from 'zod';

import { moneyAmountSchema } from '@/lib/moneySchema';
import { correctionReasonSchema } from '@/modules/moneyCorrections/schemas/correctionReason.schema';

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
  amount: moneyAmountSchema(),
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
  operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
});

export type CreateCashMovementFormValues = z.infer<typeof createCashMovementSchema>;

// Corrección de un movimiento manual: los mismos campos (y reglas) que al
// registrarlo, sin el tipo — un ingreso que en realidad era un egreso no se
// corrige: se anula y se registra el correcto. El motivo es obligatorio
// (queda en el historial inmutable del movimiento).
export const updateCashMovementSchema = createCashMovementSchema
  .pick({ category: true, amount: true, description: true, occurred_at: true, payment_account_id: true, operation_number: true })
  .extend({
    reason: correctionReasonSchema,
  });

export type UpdateCashMovementFormValues = z.infer<typeof updateCashMovementSchema>;

// Transferencia entre cuentas: de una cuenta a otra (null = Efectivo), mismo
// monto y misma fecha en las dos puntas. Las cuentas tienen que ser distintas
// (el backend lo vuelve a validar).
const transferFieldsSchema = z.object({
  from_payment_account_id: z.number().nullable(),
  to_payment_account_id: z.number().nullable(),
  amount: moneyAmountSchema(),
  occurred_at: createCashMovementSchema.shape.occurred_at,
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
  operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
});

const distinctAccounts = (values: { from_payment_account_id: number | null; to_payment_account_id: number | null }) =>
  values.from_payment_account_id !== values.to_payment_account_id;

const DISTINCT_ACCOUNTS_ISSUE = {
  message: 'La cuenta de destino tiene que ser distinta a la de origen',
  path: ['to_payment_account_id'],
};

export const createCashTransferSchema = transferFieldsSchema
  .extend({
    // Solo la elige el Super Administrador (ver CompanyStoreFields).
    company_id: z.number().optional(),
    business_unit_id: z.number().optional(),
  })
  .refine(distinctAccounts, DISTINCT_ACCOUNTS_ISSUE);

export type CreateCashTransferFormValues = z.infer<typeof createCashTransferSchema>;

// Corregir una transferencia: los mismos campos + motivo obligatorio (queda en
// el registro de auditoría).
export const updateCashTransferSchema = transferFieldsSchema
  .extend({ reason: correctionReasonSchema })
  .refine(distinctAccounts, DISTINCT_ACCOUNTS_ISSUE);

export type UpdateCashTransferFormValues = z.infer<typeof updateCashTransferSchema>;
