import { z } from 'zod';

// Mismos topes que el backend (production_workflow/services/save_config.service.ts).
export const MAX_ACTIVE_STAGES = 12;
export const MAX_TOTAL_STAGES = 40;
export const STAGE_NAME_MAX = 60;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

const stageSchema = z.object({
  // Id de la columna guardada; null = nueva. No se llama `id`: useFieldArray
  // usa ese nombre para su propia clave.
  stageId: z.number().int().positive().nullable(),
  name: z.string().trim().min(1, 'Ponle un nombre').max(STAGE_NAME_MAX, `Máximo ${STAGE_NAME_MAX} caracteres`),
  color: z.string().regex(HEX_COLOR, 'Color no válido'),
  category: z.enum(['todo', 'doing', 'done']),
  active: z.boolean(),
  moveItemsToStageId: z.number().int().positive().nullable(),
  // Solo de la pantalla (no se envían): cómo estaba la columna al cargarla.
  wasActive: z.boolean(),
  itemCount: z.number().int().min(0),
});

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('es');

// Si una columna que estaba activa se desactiva y tiene productos, hay que
// elegir a qué columna activa (ya guardada) pasan: misma regla que el backend.
const needsMoveTarget = (stage: z.infer<typeof stageSchema>) =>
  stage.stageId !== null && stage.wasActive && !stage.active && stage.itemCount > 0;

export const workflowFormSchema = z
  .object({
    flowMode: z.enum(['linear', 'free']),
    allowBackward: z.boolean(),
    stages: z.array(stageSchema).min(1).max(MAX_TOTAL_STAGES, `Hasta ${MAX_TOTAL_STAGES} columnas en total`),
  })
  .superRefine((values, ctx) => {
    const active = values.stages.filter((stage) => stage.active);
    if (active.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['stages'], message: 'El tablero necesita al menos una columna activa' });
    }
    if (active.length > MAX_ACTIVE_STAGES) {
      ctx.addIssue({ code: 'custom', path: ['stages'], message: `El tablero admite hasta ${MAX_ACTIVE_STAGES} columnas activas` });
    }

    const seen = new Set<string>();
    values.stages.forEach((stage, index) => {
      if (!stage.active) return;
      const name = normalizeName(stage.name);
      if (seen.has(name)) {
        ctx.addIssue({ code: 'custom', path: ['stages', index, 'name'], message: 'Ya hay otra columna activa con este nombre' });
      }
      seen.add(name);
    });

    const savedActiveIds = new Set(values.stages.flatMap((stage) => (stage.stageId !== null && stage.active ? [stage.stageId] : [])));
    values.stages.forEach((stage, index) => {
      if (!needsMoveTarget(stage)) return;
      if (stage.moveItemsToStageId !== null && savedActiveIds.has(stage.moveItemsToStageId)) return;
      ctx.addIssue({
        code: 'custom',
        path: ['stages', index, 'moveItemsToStageId'],
        message: 'Elige a qué columna pasan sus productos',
      });
    });
  });

export type WorkflowFormValues = z.infer<typeof workflowFormSchema>;
export type WorkflowStageFormValues = WorkflowFormValues['stages'][number];
export { needsMoveTarget };
