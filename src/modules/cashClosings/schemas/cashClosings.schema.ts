import { z } from 'zod';

import { MAX_MONEY_AMOUNT, hasAtMostTwoDecimals } from '@/lib/moneySchema';
import { correctionReasonSchema } from '@/modules/moneyCorrections/schemas/correctionReason.schema';

const notesSchema = z.string().max(500, 'Máximo 500 caracteres').optional();

export const closePeriodSchema = z.object({
  notes: notesSchema,
});
export type ClosePeriodFormValues = z.infer<typeof closePeriodSchema>;

// Motivo de reabrir un mes o de anular/restaurar un movimiento de un mes
// cerrado (mismo rango 5-500 que valida el backend).
export const reasonOnlySchema = z.object({
  reason: correctionReasonSchema,
});
export type ReasonOnlyFormValues = z.infer<typeof reasonOnlySchema>;

// Un saldo inicial puede ser cero o negativo (la cuenta pudo estar en rojo),
// pero no más grande de lo que admite la base ni con más de 2 decimales.
const openingAmountSchema = z
  .number({ error: 'Indica el monto (usa 0 si la cuenta empezó vacía)' })
  .refine(Number.isFinite, 'Indica el monto')
  .refine((value) => Math.abs(value) <= MAX_MONEY_AMOUNT, 'El monto es demasiado grande')
  .refine(hasAtMostTwoDecimals, 'Máximo 2 decimales');

export const cashOpeningSchema = z.object({
  start_period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Selecciona el mes de inicio'),
  amounts: z.array(
    z.object({
      payment_account_id: z.number().nullable(),
      amount: openingAmountSchema,
    }),
  ),
  notes: notesSchema,
});
export type CashOpeningFormValues = z.infer<typeof cashOpeningSchema>;
