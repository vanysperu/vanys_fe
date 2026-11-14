import { z } from 'zod';

// Mismas reglas que valida grulla_be (dispatch_guide.validator.ts).
export const vehicleSchema = z.object({
  company_id: z.number().int().positive().optional(),
  plate: z
    .string()
    .trim()
    .refine((value) => /^[A-Za-z0-9]{5,8}$/.test(value.replace(/[^A-Za-z0-9]/g, '')), 'La placa tiene de 5 a 8 letras o números (ej. ABC-123)'),
  description: z.string().max(120, 'Máximo 120 caracteres').optional(),
  authorization_number: z.string().max(30, 'Máximo 30 caracteres').optional(),
});
export type VehicleFormValues = z.infer<typeof vehicleSchema>;

export const driverSchema = z.object({
  company_id: z.number().int().positive().optional(),
  doc_type: z.string().min(1, 'Elige el tipo de documento'),
  doc_number: z.string().trim().regex(/^[A-Za-z0-9]{6,15}$/, 'El número de documento no es válido'),
  first_names: z.string().trim().min(1, 'Los nombres son obligatorios').max(100),
  last_names: z.string().trim().min(1, 'Los apellidos son obligatorios').max(100),
  license_number: z.string().trim().regex(/^[A-Za-z0-9-]{5,20}$/, 'El número de licencia no es válido'),
});
export type DriverFormValues = z.infer<typeof driverSchema>;

export const registerGuideSchema = z.object({
  series: z.string().trim().regex(/^[Tt][A-Za-z0-9]{3}$/, 'La serie es T y 3 caracteres (ej. T001)'),
  number: z.number({ message: 'Escribe el número' }).int().min(1, 'El número no es válido').max(99999999),
  issue_date: z.string().optional(),
});
export type RegisterGuideFormValues = z.infer<typeof registerGuideSchema>;

export const voidGuideSchema = z.object({
  reason: z.string().trim().min(5, 'Escribe el motivo (mínimo 5 caracteres)').max(255),
});
export type VoidGuideFormValues = z.infer<typeof voidGuideSchema>;
