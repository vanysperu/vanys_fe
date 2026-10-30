import { z } from 'zod';

import { addDocumentNumberIssues } from '@/lib/documentType';

// Nombre propio: solo letras/acentos/espacios/guiones — mismo criterio que
// clients (client.schema.ts) y el backend (user.validator.ts NAME_REGEX).
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
// Teléfono: 6 a 9 dígitos, solo números — mismo rango que clients
// (pedido explícito del usuario, antes el backend/frontend de usuarios
// aceptaban hasta 15).
const PHONE_REGEX = /^[0-9]{6,9}$/;

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Solo mayores de edad (pedido explícito del usuario). Se exporta para que
// el calendario del formulario (UsersListPage.tsx) deshabilite esas fechas
// directamente, en vez de dejar elegirlas y recién avisar al validar.
export const MIN_AGE_YEARS = 18;

// Fecha límite: el día de nacimiento que hace exactamente 18 años hoy. Una
// fecha de nacimiento posterior a esta todavía no cumple la mayoría de edad.
export function latestAdultBirthDate(): Date {
  const today = startOfToday();
  return new Date(today.getFullYear() - MIN_AGE_YEARS, today.getMonth(), today.getDate());
}

// Mismo shape que valida el backend (grulla_be: users/validators/user.validator.ts
// + la regla nueva en user.controller.ts -> createUserController).
const baseUserSchema = z
  .object({
    name: z.string().min(3, 'Mínimo 3 caracteres').max(255, 'Máximo 255 caracteres').regex(NAME_REGEX, 'El nombre solo puede tener letras'),
    paternal_lastname: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(255, 'Máximo 255 caracteres')
      .regex(NAME_REGEX, 'El apellido paterno solo puede tener letras'),
    maternal_lastname: z
      .string()
      .max(255, 'Máximo 255 caracteres')
      .regex(NAME_REGEX, 'El apellido materno solo puede tener letras')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Email inválido'),
    document_type: z.number({ error: 'Selecciona un tipo de documento' }),
    document_number: z.string().min(1, 'El número de documento es obligatorio'),
    date_of_birth: z
      .string()
      .min(1, 'La fecha de nacimiento es obligatoria')
      .refine((value) => new Date(value).getTime() <= startOfToday().getTime(), {
        message: 'La fecha de nacimiento no puede ser una fecha futura',
      })
      .refine((value) => new Date(value).getTime() <= latestAdultBirthDate().getTime(), {
        message: `El usuario debe ser mayor de edad (${MIN_AGE_YEARS} años o más)`,
      }),
    phone_number: z.string().regex(PHONE_REGEX, 'El teléfono debe tener entre 6 y 9 dígitos, solo números').optional().or(z.literal('')),
    address: z.string().max(255, 'Máximo 255 caracteres').optional(),
    gender: z.number({ error: 'Selecciona un género' }),
    // Todo usuario debajo de Super Administrador necesita una empresa
    // (pedido explícito del usuario): un Super Administrador la elige acá
    // (company_id obligatorio, business_unit_id opcional); un admin de
    // empresa nunca la elige (siempre la suya, forzada server-side) pero SÍ
    // necesita elegir tienda (business_unit_id obligatorio ahí). El refine
    // de abajo aplica cuál de las dos reglas corresponde según `isSystem`.
    company_id: z.number().optional(),
    business_unit_id: z.number().optional(),
    roleId: z.number({ error: 'Selecciona un rol' }),
  })
  .superRefine((data, ctx) => {
    addDocumentNumberIssues(ctx, data.document_type, data.document_number, ['document_number']);
  });

export const createUserSchema = (isSystem: boolean) =>
  baseUserSchema
    .refine((data) => !isSystem || data.company_id != null, {
      message: 'Selecciona una empresa',
      path: ['company_id'],
    })
    .refine((data) => isSystem || data.business_unit_id != null, {
      message: 'Selecciona una tienda',
      path: ['business_unit_id'],
    });

export type CreateUserFormValues = z.infer<typeof baseUserSchema>;
