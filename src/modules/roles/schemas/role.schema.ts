import { z } from 'zod';

// Mismo criterio que grulla_be: role.validator.ts (ROLE_NAME_REGEX).
const ROLE_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ0-9\s'.-]+$/;

// Mismo shape que valida el backend (grulla_be: role.validator.ts).
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(255, 'Máximo 255 caracteres')
    .regex(ROLE_NAME_REGEX, 'El nombre solo puede tener letras, números, espacios y guiones'),
  description: z.string().optional(),
});

export type CreateRoleFormValues = z.infer<typeof createRoleSchema>;
