import { z } from 'zod';

// Mismas reglas que el backend (api_key.validator.ts).
export const apiKeyFormSchema = z.object({
  company_id: z.number({ error: 'Selecciona la empresa' }),
  business_unit_id: z.number().optional(),
  name: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'Máximo 100 caracteres'),
});

export type ApiKeyFormValues = z.infer<typeof apiKeyFormSchema>;
