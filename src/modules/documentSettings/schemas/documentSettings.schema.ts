import { z } from 'zod';

// Mismo criterio que el backend (company.validator.ts).
export const COMPANY_PHONE_MAX_DIGITS = 15;
const COMPANY_PHONE_REGEX = /^\d{6,15}$/;

// Yape y Plin se identifican por un celular peruano: mismo criterio que el
// backend (payment_account.service.ts). Una cuenta bancaria no tiene formato fijo.
export const MOBILE_WALLET_DIGITS = 9;
const MOBILE_WALLET_REGEX = /^9\d{8}$/;
const MOBILE_WALLET_LABEL: Record<string, string> = { yape: 'Yape', plin: 'Plin' };

export const isMobileWallet = (type: string | undefined): boolean => Boolean(type && MOBILE_WALLET_LABEL[type]);

export const updateDocumentSettingsSchema = z.object({
  business_name: z.string().min(1, 'La razón social es obligatoria').max(255, 'Máximo 255 caracteres'),
  address: z.string().max(255, 'Máximo 255 caracteres').optional(),
  phone: z
    .string()
    .regex(COMPANY_PHONE_REGEX, 'El teléfono debe tener entre 6 y 15 dígitos, solo números')
    .optional()
    .or(z.literal('')),
  legal_terms_caption: z.string().max(4000, 'Máximo 4000 caracteres').optional(),
});

export type UpdateDocumentSettingsFormValues = z.infer<typeof updateDocumentSettingsSchema>;

export const createPaymentAccountSchema = z
  .object({
    prefix_id: z.enum(['bank', 'yape', 'plin'], { error: 'Selecciona un tipo' }),
    name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
    ref1: z.string().min(1, 'El número de cuenta/teléfono es obligatorio').max(50, 'Máximo 50 caracteres'),
    show_in_quotation: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!isMobileWallet(values.prefix_id) || MOBILE_WALLET_REGEX.test(values.ref1)) return;
    ctx.addIssue({
      code: 'custom',
      path: ['ref1'],
      message: `El número de ${MOBILE_WALLET_LABEL[values.prefix_id]} debe tener 9 dígitos y empezar con 9`,
    });
  });

export type CreatePaymentAccountFormValues = z.infer<typeof createPaymentAccountSchema>;
