import { z } from 'zod';

import { addDocumentNumberIssues } from '@/lib/documentType';

// Solo letras/espacios/acentos — pedido explícito del usuario: "me permite
// colocar números en letras y letras en número". Incluye ñ/Ñ y tildes.
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/;
// 6 a 9 dígitos, solo números (ni espacios ni guiones) — mismo pedido:
// "no tiene un mínimo de 6 y máximo de 9 para lo que es el teléfono".
const PHONE_REGEX = /^\d{6,9}$/;
// Tope que usan los inputs para no dejar escribir de más.
export const PHONE_MAX_DIGITS = 9;

export const createClientSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').regex(NAME_REGEX, 'El nombre solo puede tener letras'),
    // El tipo y el número van juntos (o ninguno) — antes "Documento" era un
    // texto libre sin tipo ni largo validado, permitiendo letras y más de
    // 12 dígitos sin avisar (bug reportado por QA: "debería ser tipo de
    // documento y colocar el tamaño dependiendo de cada uno"). Mismo
    // catálogo/reglas que Usuarios (lib/documentType.ts).
    document_type: z.number().optional(),
    document_number: z.string().max(20, 'Máximo 20 caracteres').optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z
      .string()
      .regex(PHONE_REGEX, 'El teléfono debe tener entre 6 y 9 dígitos, solo números')
      .optional()
      .or(z.literal('')),
    address: z.string().max(255, 'Máximo 255 caracteres').optional(),
    // Solo los elige el Super Administrador (ver CompanyStoreFields).
    company_id: z.number().optional(),
    business_unit_id: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const hasType = data.document_type != null;
    const hasNumber = Boolean(data.document_number);
    if (!hasType && !hasNumber) return;
    if (hasType !== hasNumber) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indica el tipo y el número de documento juntos',
        path: [hasType ? 'document_number' : 'document_type'],
      });
      return;
    }
    addDocumentNumberIssues(ctx, data.document_type, data.document_number!, ['document_number']);
  });

export type CreateClientFormValues = z.infer<typeof createClientSchema>;
