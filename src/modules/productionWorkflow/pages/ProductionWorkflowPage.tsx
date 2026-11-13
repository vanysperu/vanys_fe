import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeftRight, Check, ChevronRight, Columns3, Plus, Route, Undo2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { cn } from '@/lib/utils';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { StageEditorRow } from '@/modules/productionWorkflow/components/StageEditorRow';
import { useSaveWorkflowConfig, useWorkflowConfig } from '@/modules/productionWorkflow/hooks/useProductionWorkflow';
import {
  MAX_ACTIVE_STAGES,
  workflowFormSchema,
  type WorkflowFormValues,
  type WorkflowStageFormValues,
} from '@/modules/productionWorkflow/schemas/productionWorkflow.schema';
import type { FlowMode, SaveWorkflowConfigDto, WorkflowConfig } from '@/modules/productionWorkflow/types/productionWorkflow.types';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Colores que se proponen para una columna nueva (se pueden cambiar).
const NEW_STAGE_COLORS = ['#0F766E', '#B45309', '#7C3AED', '#BE185D', '#0369A1', '#4D7C0F'];

const toFormValues = (config: WorkflowConfig): WorkflowFormValues => ({
  flowMode: config.flowMode,
  allowBackward: config.allowBackward,
  stages: config.stages.map((stage) => ({
    stageId: stage.id,
    name: stage.name,
    color: stage.color.toUpperCase(),
    category: stage.category,
    active: stage.active,
    moveItemsToStageId: null,
    wasActive: stage.active,
    itemCount: stage.itemCount,
  })),
});

const toDto = (values: WorkflowFormValues, companyId: number | undefined): SaveWorkflowConfigDto => ({
  ...(companyId ? { company_id: companyId } : {}),
  flowMode: values.flowMode,
  allowBackward: values.allowBackward,
  stages: values.stages.map((stage) => ({
    id: stage.stageId,
    name: stage.name.trim(),
    color: stage.color,
    category: stage.category,
    active: stage.active,
    moveItemsToStageId: stage.moveItemsToStageId,
  })),
});

// Sprint 2, ítem 5 (pedido del usuario): cada empresa elige las columnas del
// kanban de producción de sus cotizaciones, su orden y cómo avanzan los
// productos. Como "Documentos de la empresa": es por empresa y el Super
// Administrador elige primero cuál configurar.
export function ProductionWorkflowPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flujo de producción"
        description="Las columnas del tablero de producción de tus cotizaciones y cómo avanzan los productos"
      />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {ready ? (
        // key: al cambiar de empresa se remonta sin arrastrar cambios sin guardar.
        <WorkflowEditor key={companyId ?? 'own'} companyId={companyId} />
      ) : (
        <p className="text-sm text-muted-foreground">Elige la empresa que quieres configurar.</p>
      )}
    </div>
  );
}

function WorkflowEditor({ companyId }: { companyId?: number }) {
  const { data: config, isLoading } = useWorkflowConfig(companyId);
  const { mutate: save, isPending: isSaving } = useSaveWorkflowConfig();
  const canSave = usePermissionButton('production_workflow.update.button');
  const disabled = !canSave || isSaving;

  const {
    control,
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    values: config ? toFormValues(config) : undefined,
  });
  const { fields, move, insert, remove } = useFieldArray({ control, name: 'stages' });
  const stages = useWatch({ control, name: 'stages' }) ?? [];
  const flowMode = useWatch({ control, name: 'flowMode' });
  const allowBackward = useWatch({ control, name: 'allowBackward' });

  if (isLoading || !config) {
    return <Skeleton className="h-96 w-full" />;
  }

  const activeStages = stages.filter((stage) => stage.active);
  const moveTargets = stages.flatMap((stage) =>
    stage.stageId !== null && stage.active ? [{ stageId: stage.stageId, name: stage.name.trim() || 'Sin nombre' }] : [],
  );

  const patchStage = (index: number, patch: Partial<WorkflowStageFormValues>) => {
    Object.entries(patch).forEach(([key, value]) => {
      setValue(`stages.${index}.${key as keyof WorkflowStageFormValues}`, value as never, {
        shouldDirty: true,
        shouldValidate: key !== 'name',
      });
    });
  };

  // La columna nueva entra antes de la última si esa es de tipo "terminado"
  // (casi siempre "Listo"): así no queda una columna en curso después del final.
  const addStage = () => {
    const lastIndex = stages.length - 1;
    const insertAt = stages[lastIndex]?.category === 'done' ? lastIndex : stages.length;
    insert(insertAt, {
      stageId: null,
      name: '',
      color: NEW_STAGE_COLORS[stages.length % NEW_STAGE_COLORS.length] ?? '#64748B',
      category: 'doing',
      active: true,
      moveItemsToStageId: null,
      wasActive: true,
      itemCount: 0,
    });
  };

  const onSubmit = (values: WorkflowFormValues) =>
    save(toDto(values, companyId), {
      onSuccess: () => toast.success('Flujo de producción guardado'),
      onError: (error) => toast.error((error as ApiClientError).message),
    });

  const stagesError = errors.stages?.message ?? errors.stages?.root?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-1.5">
          <Route className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Cómo avanzan los productos</h2>
        </div>
        <div role="radiogroup" aria-label="Modo de avance" className="grid gap-3 sm:grid-cols-2">
          <FlowModeOption
            mode="linear"
            selected={flowMode === 'linear'}
            disabled={disabled}
            title="Lineal"
            description="Cada producto pasa de una columna a la siguiente, sin saltarse ninguna."
            icon={<ChevronRight className="size-4" />}
            onSelect={(mode) => setValue('flowMode', mode, { shouldDirty: true })}
          />
          <FlowModeOption
            mode="free"
            selected={flowMode === 'free'}
            disabled={disabled}
            title="Libre"
            description="Cada producto puede pasar a cualquier columna."
            icon={<ArrowLeftRight className="size-4" />}
            onSelect={(mode) => setValue('flowMode', mode, { shouldDirty: true })}
          />
        </div>
        {flowMode === 'linear' && (
          <label className="mt-3 flex items-center gap-3 text-sm">
            <ToggleSwitch
              checked={allowBackward}
              disabled={disabled}
              label="Permitir volver a la columna anterior"
              onCheckedChange={(checked) => setValue('allowBackward', checked, { shouldDirty: true })}
            />
            Permitir volver a la columna anterior (para corregir un movimiento)
          </label>
        )}
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Columns3 className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Columnas del tablero</h2>
          <span className="text-xs text-muted-foreground">
            {activeStages.length} de {MAX_ACTIVE_STAGES} activas
          </span>
          {canSave && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto"
              disabled={disabled || activeStages.length >= MAX_ACTIVE_STAGES}
              onClick={addStage}
            >
              <Plus className="size-4" />
              Agregar columna
            </Button>
          )}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Las columnas no se eliminan: se desactivan, para no perder el historial de los productos que pasaron por
          ellas. El tipo (por hacer, en curso, terminado) sirve para las estadísticas de producción.
        </p>

        <BoardPreview stages={activeStages} flowMode={flowMode} allowBackward={allowBackward} />

        <ol className="mt-4 space-y-2">
          {fields.map((field, index) => {
            const stage = stages[index];
            if (!stage) return null;
            return (
              <StageEditorRow
                key={field.id}
                index={index}
                total={fields.length}
                stage={stage}
                register={register}
                errors={errors}
                moveTargets={moveTargets.filter((target) => target.stageId !== stage.stageId)}
                disabled={disabled}
                onMove={(from, to) => move(from, to)}
                onChange={(patch) => patchStage(index, patch)}
                onRemove={() => remove(index)}
              />
            );
          })}
        </ol>
        {stagesError && <p className="mt-2 text-xs text-destructive">{stagesError}</p>}
      </section>

      {canSave && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isDirty && <span className="mr-auto text-xs text-warning">Tienes cambios sin guardar</span>}
          <Button type="button" variant="ghost" size="sm" disabled={!isDirty || isSaving} onClick={() => reset()}>
            <Undo2 className="size-4" />
            Descartar cambios
          </Button>
          <Button type="submit" size="sm" disabled={!isDirty || isSaving}>
            <Check className="size-4" />
            {isSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      )}
    </form>
  );
}

function FlowModeOption({
  mode,
  selected,
  disabled,
  title,
  description,
  icon,
  onSelect,
}: {
  mode: FlowMode;
  selected: boolean;
  disabled: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: (mode: FlowMode) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => onSelect(mode)}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {icon}
      </span>
      <span className="space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

// Vista previa del tablero tal como quedará: columnas activas en orden.
function BoardPreview({
  stages,
  flowMode,
  allowBackward,
}: {
  stages: WorkflowStageFormValues[];
  flowMode: FlowMode;
  allowBackward: boolean;
}) {
  const Arrow = allowBackward ? ArrowLeftRight : ChevronRight;

  return (
    <div className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto rounded-lg bg-muted/30 p-2.5" aria-label="Vista previa del tablero">
      {stages.length === 0 && <span className="text-xs text-muted-foreground">Sin columnas activas</span>}
      {stages.map((stage, index) => (
        <div key={`${stage.stageId ?? 'new'}-${index}`} className="flex shrink-0 items-center gap-1.5">
          {index > 0 && flowMode === 'linear' && <Arrow className="size-3.5 text-muted-foreground" />}
          <span className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium">
            <span className="size-2 rounded-full" style={{ background: stage.color }} />
            {stage.name.trim() || 'Sin nombre'}
          </span>
        </div>
      ))}
    </div>
  );
}
