import { z } from 'zod';

// SKU: código alfanumérico (con guion/guion bajo) — mismo criterio que el backend.
const SKU_REGEX = /^[A-Za-z0-9_-]+$/;

export const createProductSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
    description: z.string().optional(),
    sku: z
      .string()
      .max(50, 'Máximo 50 caracteres')
      .regex(SKU_REGEX, 'El SKU solo puede tener letras, números, guiones y guion bajo')
      .optional()
      .or(z.literal('')),
    price_unit: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_hundred: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_half_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    company_id: z.number().optional(),
  })
  .refine(
    (data) =>
      data.price_unit != null || data.price_hundred != null || data.price_half_thousand != null || data.price_thousand != null,
    {
      message: 'Carga al menos un precio (por unidad, por ciento, medio millar o por millar)',
      path: ['price_unit'],
    },
  );

export type CreateProductFormValues = z.infer<typeof createProductSchema>;

// "fixed" ahora es tarifa por volumen (igual que createProductSchema, misma
// regla: con uno de los 4 precios alcanza); "percentage" sigue usando un
// solo valor porque ya escala solo con el precio base del producto.
export const createTechniqueSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
    description: z.string().optional(),
    extra_type: z.enum(['fixed', 'percentage']),
    extra_value: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_unit: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_hundred: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_half_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    company_id: z.number().optional(),
  })
  .refine((data) => data.extra_type !== 'percentage' || data.extra_value != null, {
    message: 'El costo adicional es obligatorio',
    path: ['extra_value'],
  })
  .refine(
    (data) =>
      data.extra_type !== 'fixed' ||
      data.price_unit != null ||
      data.price_hundred != null ||
      data.price_half_thousand != null ||
      data.price_thousand != null,
    {
      message: 'Carga al menos un precio (por unidad, por ciento, medio millar o por millar)',
      path: ['price_unit'],
    },
  );

export type CreateTechniqueFormValues = z.infer<typeof createTechniqueSchema>;
