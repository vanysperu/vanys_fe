import { z } from 'zod';

// Mismo shape que valida el backend (grulla_be: variable_general.validator.ts).
export const createVariableGeneralSchema = z.object({
  category: z.string().min(1, 'La categoría es obligatoria').max(255, 'Máximo 255 caracteres'),
  title: z.string().min(1, 'El título es obligatorio').max(255, 'Máximo 255 caracteres'),
  prefix_id: z.string().min(1, 'El código es obligatorio').max(255, 'Máximo 255 caracteres'),
  name: z.string().min(1, 'El nombre es obligatorio').max(255, 'Máximo 255 caracteres'),
  description: z.string().max(255, 'Máximo 255 caracteres').optional(),
  // Datos extra que algunas categorías guardan aparte (ver REF_FIELDS en
  // VariableGeneralPage.tsx): número de cuenta, color de etapa, orden...
  ref1: z.string().max(255, 'Máximo 255 caracteres').optional(),
  ref2: z.string().max(255, 'Máximo 255 caracteres').optional(),
  // undefined/0 = Global (visible para todas las empresas). Solo lo elige
  // is_system — un usuario de empresa siempre queda forzado a la suya
  // (grulla_be: variable_general.controller.ts -> createVariableGeneralController).
  company_id: z.number().optional(),
});

export type CreateVariableGeneralFormValues = z.infer<typeof createVariableGeneralSchema>;
