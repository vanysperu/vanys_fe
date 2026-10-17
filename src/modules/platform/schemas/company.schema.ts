import { z } from 'zod';

// RUC peruano: exactamente 11 dígitos numéricos — mismo criterio que el backend.
const RUC_REGEX = /^\d{11}$/;
// Teléfono de empresa: solo dígitos — mismo criterio que el backend.
const PHONE_REGEX = /^\d{6,15}$/;

// Mismo shape que valida el backend (grulla_be: company.validator.ts).
export const createCompanySchema = z.object({
  ruc: z.string().min(1, 'El RUC es obligatorio').regex(RUC_REGEX, 'El RUC debe tener exactamente 11 dígitos numéricos'),
  business_name: z.string().min(1, 'La razón social es obligatoria').max(255, 'Máximo 255 caracteres'),
  email: z.string().email('El email debe ser válido').max(150, 'Máximo 150 caracteres').optional().or(z.literal('')),
  phone: z.string().regex(PHONE_REGEX, 'El teléfono debe tener entre 6 y 15 dígitos, solo números').optional().or(z.literal('')),
  address: z.string().max(255, 'Máximo 255 caracteres').optional(),
  theme_color: z.string().optional(),
});

export type CreateCompanyFormValues = z.infer<typeof createCompanySchema>;
