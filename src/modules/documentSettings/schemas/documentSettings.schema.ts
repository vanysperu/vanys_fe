import { z } from 'zod';

export const updateDocumentSettingsSchema = z.object({
  business_name: z.string().min(1, 'La razón social es obligatoria').max(255, 'Máximo 255 caracteres'),
  address: z.string().max(255, 'Máximo 255 caracteres').optional(),
  phone: z.string().max(30, 'Máximo 30 caracteres').optional(),
  legal_terms_caption: z.string().max(4000, 'Máximo 4000 caracteres').optional(),
});

export type UpdateDocumentSettingsFormValues = z.infer<typeof updateDocumentSettingsSchema>;

export const createPaymentAccountSchema = z.object({
  prefix_id: z.enum(['bank', 'yape', 'plin'], { error: 'Selecciona un tipo' }),
  name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
  ref1: z.string().min(1, 'El número de cuenta/teléfono es obligatorio').max(50, 'Máximo 50 caracteres'),
});

export type CreatePaymentAccountFormValues = z.infer<typeof createPaymentAccountSchema>;
