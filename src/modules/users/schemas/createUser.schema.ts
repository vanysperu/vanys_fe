import { z } from 'zod';

// Nombre propio: solo letras/acentos/espacios/guiones — mismo criterio que
// clients (client.schema.ts) y el backend (user.validator.ts NAME_REGEX).
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
// Teléfono: 6 a 9 dígitos, solo números — mismo rango que clients
// (pedido explícito del usuario, antes el backend/frontend de usuarios
// aceptaban hasta 15).
const PHONE_REGEX = /^[0-9]{6,9}$/;

// Reglas EXACTAS por tipo de documento — mismo criterio que ya aplica el
// backend (grulla_be: user.validator.ts -> createUserDtoValidator,
// body("document_type").custom(...)). Antes el frontend solo validaba un
// rango genérico (6-12) sin importar el tipo, así que un DNI de 7 u 11
// dígitos pasaba el formulario y recién reventaba en el backend con un
// error poco claro (pedido explícito del usuario: "los números de tipo de
// documento no son acordes al documento, debe ser exacto").
const DOCUMENT_TYPE_DNI = 1;
const DOCUMENT_TYPE_PASSPORT = 2;
const DOCUMENT_TYPE_CE = 3;
const DOCUMENT_TYPE_RUC = 6;

interface DocumentRule {
  // Exacto cuando min === max (DNI/RUC); rango cuando difieren (CE/PAS,
  // documentos extranjeros cuyo largo real varía por país).
  min: number;
  max: number;
  onlyDigits: boolean;
  label: string;
}

const DOCUMENT_RULES: Record<number, DocumentRule> = {
  [DOCUMENT_TYPE_DNI]: { min: 8, max: 8, onlyDigits: true, label: 'El DNI debe tener exactamente 8 dígitos' },
  [DOCUMENT_TYPE_RUC]: { min: 11, max: 11, onlyDigits: true, label: 'El RUC debe tener exactamente 11 dígitos' },
  [DOCUMENT_TYPE_CE]: { min: 9, max: 12, onlyDigits: false, label: 'El CE debe tener entre 9 y 12 caracteres' },
  [DOCUMENT_TYPE_PASSPORT]: { min: 6, max: 9, onlyDigits: false, label: 'El pasaporte debe tener entre 6 y 9 caracteres' },
};

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
    const rule = DOCUMENT_RULES[data.document_type];
    if (!rule) return;

    if (data.document_number.length < rule.min || data.document_number.length > rule.max) {
      ctx.addIssue({ code: 'custom', message: rule.label, path: ['document_number'] });
      return;
    }
    if (rule.onlyDigits && !/^\d+$/.test(data.document_number)) {
      ctx.addIssue({ code: 'custom', message: 'Debe contener solo dígitos', path: ['document_number'] });
    }
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
