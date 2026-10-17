import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '@/lib/constants';

export const createPurchaseOrderSchema = z.object({
  assigned_to: z.number({ error: 'Selecciona a quién se le asigna' }),
  notes: z.string().max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres`).optional(),
  itemIds: z.array(z.number()).min(1, 'Selecciona al menos un producto'),
});

export type CreatePurchaseOrderFormValues = z.infer<typeof createPurchaseOrderSchema>;
