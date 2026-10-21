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
    // Apagado por defecto (decisión del usuario): la mayoría no se personaliza.
    requires_customization: z.boolean().optional(),
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

// La técnica funciona igual que el producto: 4 precios por volumen, y con
// uno cargado alcanza. El item cobra (producto + técnica) en el mismo modo ×
// cantidad. Ya no existe el modo porcentual.
export const createTechniqueSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
    description: z.string().optional(),
    price_unit: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_hundred: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_half_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    price_thousand: z.number().min(0, 'Debe ser un número positivo').optional(),
    company_id: z.number().optional(),
  })
  .refine(
    (data) =>
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
