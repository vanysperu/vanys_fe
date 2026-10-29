import { z } from 'zod';

// Mismo criterio que createUser.schema.ts / backend (user.validator.ts).
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
// 6 a 9 dígitos (pedido explícito del usuario, antes aceptaba hasta 15).
const PHONE_REGEX = /^[0-9]{6,9}$/;

// Mismas reglas EXACTAS por tipo de documento que createUser.schema.ts —
// antes acá solo había un tope genérico de 12, sin importar el tipo.
const DOCUMENT_RULES: Record<number, { min: number; max: number; onlyDigits: boolean; label: string }> = {
  1: { min: 8, max: 8, onlyDigits: true, label: 'El DNI debe tener exactamente 8 dígitos' },
  6: { min: 11, max: 11, onlyDigits: true, label: 'El RUC debe tener exactamente 11 dígitos' },
  3: { min: 9, max: 12, onlyDigits: false, label: 'El CE debe tener entre 9 y 12 caracteres' },
  2: { min: 6, max: 9, onlyDigits: false, label: 'El pasaporte debe tener entre 6 y 9 caracteres' },
};

// Espejo de updateUserDtoValidator (grulla_be): todo opcional, pero si se
// envía un campo debe cumplir las mismas reglas que en creación.
export const updateUserSchema = z
  .object({
    name: z.string().min(3, 'Mínimo 3 caracteres').max(255, 'Máximo 255 caracteres').regex(NAME_REGEX, 'El nombre solo puede tener letras').optional(),
    paternal_lastname: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(255, 'Máximo 255 caracteres')
      .regex(NAME_REGEX, 'El apellido paterno solo puede tener letras')
      .optional(),
    maternal_lastname: z
      .string()
      .max(255, 'Máximo 255 caracteres')
      .regex(NAME_REGEX, 'El apellido materno solo puede tener letras')
      .optional()
      .or(z.literal('')),
    email: z.string().email('Email inválido').optional(),
    document_type: z.number().optional(),
    document_number: z.string().max(12, 'Máximo 12 caracteres').optional(),
    date_of_birth: z.string().optional(),
    phone_number: z.string().regex(PHONE_REGEX, 'El teléfono debe tener entre 6 y 9 dígitos, solo números').optional().or(z.literal('')),
    address: z.string().max(255, 'Máximo 255 caracteres').optional(),
    gender: z.number().optional(),
    roleId: z.number().optional(),
    // Editables ahora (antes el backend ni los aceptaba — bug reportado por
    // QA: "no permite editar ni asignar Empresa/Tienda al modificar un
    // usuario"). Omitidos = no se toca lo que ya tenía el usuario.
    company_id: z.number().optional(),
    business_unit_id: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.document_type || !data.document_number) return;
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

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
