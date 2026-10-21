import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '@/lib/constants';

// La cantidad es siempre obligatoria: cada modo de precio (unidad/ciento/
// medio millar/millar/personalizado) es una tarifa POR UNIDAD, no el
// precio de un lote cerrado — el subtotal es precio_por_unidad × cantidad
// en todos los casos.
export const quotationItemSchema = z
  .object({
    product_id: z.number({ error: 'Selecciona un producto' }),
    // Obligatoria solo si el producto requiere personalización — eso lo
    // revisa el formulario al enviar (depende del producto elegido) y lo
    // revalida el backend.
    technique_id: z.number().optional(),
    quantity: z.number({ error: 'La cantidad es obligatoria' }).int().min(1, 'Mínimo 1'),
    pricing_mode: z.enum(['unit', 'hundred', 'half_thousand', 'thousand', 'custom'], {
      error: 'Selecciona un modo de precio',
    }),
    custom_price: z.number().min(0, 'Debe ser un número positivo').optional(),
    // Extra de la técnica cuando pricing_mode="custom" — opcional (si la
    // técnica es "percentage" no hace falta, ya escala desde custom_price;
    // si es "fixed" y no se manda, el backend cae a technique.price_unit).
    custom_technique_price: z.number().min(0, 'Debe ser un número positivo').optional(),
  })
  .refine((data) => data.pricing_mode !== 'custom' || data.custom_price != null, {
    message: 'Ingresa el precio personalizado',
    path: ['custom_price'],
  });

export const createQuotationSchema = z.object({
  client_id: z.number({ error: 'Selecciona un cliente' }),
  business_unit_id: z.number().optional(),
  notes: z.string().max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres`).optional(),
  company_id: z.number().optional(),
  items: z.array(quotationItemSchema).min(1, 'Agrega al menos un producto'),
  // includes_delivery/includes_design son solo informativas (se muestran
  // en el PDF); includes_igv sí afecta el total (18%, ver backend
  // computeQuotationTotal).
  includes_delivery: z.boolean().optional(),
  includes_design: z.boolean().optional(),
  includes_igv: z.boolean().optional(),
  // Solo se usan si billing_enabled está marcado — el cliente vinculado
  // (client_id) nunca cambia, esto solo afecta el nombre/documento que se
  // imprime en el PDF.
  billing_enabled: z.boolean().optional(),
  billing_name: z.string().max(255, 'Máximo 255 caracteres').optional(),
  billing_document_number: z.string().max(20, 'Máximo 20 caracteres').optional(),
  // Días hábiles que toma la producción — informativo, se imprime en el PDF.
  production_days: z.number().int().min(1, 'Mínimo 1 día').max(365, 'Máximo 365 días').optional(),
});

export type CreateQuotationFormValues = z.infer<typeof createQuotationSchema>;

// El "efectivo" es el único método que no exige número de operación —
// mismo identificador estable (prefix_id de general_variable) que usa el
// backend para validar esto (ver CASH_PAYMENT_METHOD).
export const CASH_PAYMENT_METHOD = 'cash';

export const createQuotationPaymentSchema = z
  .object({
    amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
    method: z.string({ error: 'Selecciona un método de pago' }).min(1, 'Selecciona un método de pago'),
    paid_at: z.string({ error: 'La fecha es obligatoria' }).min(1, 'La fecha es obligatoria'),
    notes: z.string().max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres`).optional(),
    operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
    // Cuenta a la que entró el dinero (null = efectivo). Que sea obligatoria
    // cuando el método no es efectivo y la empresa tiene cuentas lo decide
    // el formulario (depende de las cuentas configuradas) y lo revalida el
    // backend.
    payment_account_id: z.number().nullable().optional(),
  })
  .refine((data) => data.method === CASH_PAYMENT_METHOD || Boolean(data.operation_number?.trim()), {
    message: 'El número de operación es obligatorio para pagos que no son en efectivo',
    path: ['operation_number'],
  });

export type CreateQuotationPaymentFormValues = z.infer<typeof createQuotationPaymentSchema>;

export const PAYMENT_ACCOUNT_REQUIRED_MESSAGE = 'Indica a qué cuenta (banco, Yape o Plin) entró el pago';

// 300/50 caracteres: mismos topes que el backend (columna VARCHAR(50) para
// category) — evita el error de "dato demasiado largo" antes de enviarlo.
export const createQuotationExpenseSchema = z.object({
  description: z
    .string({ error: 'La descripción es obligatoria' })
    .min(1, 'La descripción es obligatoria')
    .max(300, 'Máximo 300 caracteres'),
  amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
  category: z.string().max(50, 'Máximo 50 caracteres').optional(),
  spent_at: z.string({ error: 'La fecha es obligatoria' }).min(1, 'La fecha es obligatoria'),
});

export type CreateQuotationExpenseFormValues = z.infer<typeof createQuotationExpenseSchema>;
