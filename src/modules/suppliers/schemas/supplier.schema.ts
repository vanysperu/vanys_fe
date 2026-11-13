import { z } from 'zod';

import { addDocumentNumberIssues } from '@/lib/documentType';

// Mismas reglas que el backend (supplier.validator.ts).
const PHONE_REGEX = /^\+?[0-9 ]{6,20}$/;

export const supplierSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').max(200, 'Máximo 200 caracteres'),
    trade_name: z.string().max(200, 'Máximo 200 caracteres').optional(),
    // El tipo y el número van juntos (o ninguno), como en Clientes.
    document_type: z.number().optional(),
    document_number: z.string().max(20, 'Máximo 20 caracteres').optional(),
    email: z.string().email('Email inválido').optional().or(z.literal('')),
    phone: z.string().regex(PHONE_REGEX, 'Solo números (y + al inicio), de 6 a 20').optional().or(z.literal('')),
    address: z.string().max(255, 'Máximo 255 caracteres').optional(),
    is_carrier: z.boolean().optional(),
    mtc_registration: z.string().max(30, 'Máximo 30 caracteres').optional(),
    // Solo lo elige el Super Administrador (ver CompanyStoreFields).
    company_id: z.number().optional(),
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
    addDocumentNumberIssues(ctx, data.document_type, data.document_number ?? '', ['document_number']);
  });

export type SupplierFormValues = z.infer<typeof supplierSchema>;
