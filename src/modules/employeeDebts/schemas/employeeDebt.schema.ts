import { z } from 'zod';

import { moneyAmountSchema } from '@/lib/moneySchema';
import { correctionReasonSchema } from '@/modules/moneyCorrections/schemas/correctionReason.schema';

// Deuda manual con un trabajador (ej. pagó la luz con su plata). Mismos
// topes que el backend (descripción 3–300, categoría del catálogo de Caja,
// monto con 2 decimales, fecha nunca futura — la fecha la limita el
// calendario y la revalida el backend).
export const createManualDebtSchema = z.object({
  company_id: z.number().optional(),
  business_unit_id: z.number().nullable().optional(),
  user_id: z.number({ error: 'Selecciona el trabajador que puso el dinero' }),
  description: z
    .string({ error: 'Describe qué se pagó' })
    .trim()
    .min(3, 'Describe qué se pagó (mínimo 3 caracteres)')
    .max(300, 'Máximo 300 caracteres'),
  category: z.string({ error: 'Selecciona la categoría del gasto' }).min(1, 'Selecciona la categoría del gasto'),
  amount: moneyAmountSchema(),
  incurred_at: z.string({ error: 'Indica la fecha en que se pagó' }).min(1, 'Indica la fecha en que se pagó'),
});

export type CreateManualDebtFormValues = z.infer<typeof createManualDebtSchema>;

// Categorías del catálogo de Caja que son de ingreso: no aplican a una deuda
// (es un gasto). El catálogo no guarda el sentido; el backend descarta las
// mismas.
export const INCOME_ONLY_CATEGORIES = ['otro_ingreso', 'aporte_capital'];

// Corregir una deuda MANUAL: los mismos campos (y reglas) que al
// registrarla, más el motivo. Empresa y origen no se corrigen.
export const correctManualDebtSchema = createManualDebtSchema
  .pick({ user_id: true, description: true, category: true, amount: true, incurred_at: true, business_unit_id: true })
  .extend({ reason: correctionReasonSchema });

export type CorrectManualDebtFormValues = z.infer<typeof correctManualDebtSchema>;

// Corregir una reposición: monto, fecha y cuenta (el trabajador no).
export const correctReimbursementSchema = z.object({
  amount: moneyAmountSchema(),
  paid_at: z.string({ error: 'Indica la fecha en que se le repuso' }).min(1, 'Indica la fecha en que se le repuso'),
  payment_account_id: z.number().nullable(),
  operation_number: z.string().max(50, 'Máximo 50 caracteres'),
  reason: correctionReasonSchema,
});

export type CorrectReimbursementFormValues = z.infer<typeof correctReimbursementSchema>;
