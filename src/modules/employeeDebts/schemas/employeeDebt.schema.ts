import { z } from 'zod';

import { moneyAmountSchema } from '@/lib/moneySchema';

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
