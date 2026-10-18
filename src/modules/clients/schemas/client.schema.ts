import { z } from 'zod';

// Solo letras/espacios/acentos — pedido explícito del usuario: "me permite
// colocar números en letras y letras en número". Incluye ñ/Ñ y tildes.
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
// 6 a 9 dígitos, solo números (ni espacios ni guiones) — mismo pedido:
// "no tiene un mínimo de 6 y máximo de 9 para lo que es el teléfono".
const PHONE_REGEX = /^\d{6,9}$/;
// Tope que usan los inputs para no dejar escribir de más.
export const PHONE_MAX_DIGITS = 9;

export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').regex(NAME_REGEX, 'El nombre solo puede tener letras'),
  document_number: z.string().max(20, 'Máximo 20 caracteres').optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(PHONE_REGEX, 'El teléfono debe tener entre 6 y 9 dígitos, solo números')
    .optional()
    .or(z.literal('')),
  address: z.string().max(255, 'Máximo 255 caracteres').optional(),
  company_id: z.number().optional(),
});

export type CreateClientFormValues = z.infer<typeof createClientSchema>;
