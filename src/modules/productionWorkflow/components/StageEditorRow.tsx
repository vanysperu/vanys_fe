import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { cn } from '@/lib/utils';
import { needsMoveTarget, STAGE_NAME_MAX, type WorkflowFormValues, type WorkflowStageFormValues } from '@/modules/productionWorkflow/schemas/productionWorkflow.schema';
import { STAGE_CATEGORY_LABEL, type StageCategory } from '@/modules/productionWorkflow/types/productionWorkflow.types';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

interface MoveTargetOption {
  stageId: number;
  name: string;
}

interface StageEditorRowProps {
  index: number;
  total: number;
  stage: WorkflowStageFormValues;
  register: UseFormRegister<WorkflowFormValues>;
  errors: FieldErrors<WorkflowFormValues>;
  // Columnas guardadas que quedan activas: destino posible de los productos
  // de esta columna si se desactiva.
  moveTargets: MoveTargetOption[];
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onChange: (patch: Partial<WorkflowStageFormValues>) => void;
  onRemove: () => void;
}

const CATEGORY_OPTIONS = Object.entries(STAGE_CATEGORY_LABEL) as [StageCategory, string][];

// Una columna del flujo en la pantalla de configuración: orden (subir/bajar),
// color, nombre, tipo, cuántos productos tiene y activar/desactivar. Si se
// desactiva una columna con productos, pide a qué columna pasan.
export function StageEditorRow({
  index,
  total,
  stage,
  register,
  errors,
  moveTargets,
  disabled,
  onMove,
  onChange,
  onRemove,
}: StageEditorRowProps) {
  const rowErrors = errors.stages?.[index];
  const isNew = stage.stageId === null;
  const label = stage.name.trim() || 'columna';

  return (
    <li
      className={cn('rounded-lg border bg-card p-2.5', !stage.active && 'bg-muted/40')}
      data-testid="workflow-stage-row"
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
            aria-label={`Subir ${label}`}
            title="Subir"
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={disabled || index === total - 1}
            onClick={() => onMove(index, index + 1)}
            aria-label={`Bajar ${label}`}
            title="Bajar"
          >
            <ArrowDown className="size-3.5" />
          </Button>
        </div>

        <input
          type="color"
          className="mt-0.5 h-9 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent p-1 disabled:cursor-not-allowed"
          value={stage.color}
          disabled={disabled}
          onChange={(event) => onChange({ color: event.target.value.toUpperCase() })}
          aria-label={`Color de ${label}`}
        />

        <div className="min-w-40 flex-1 space-y-1">
          <Input
            placeholder="Nombre de la columna"
            maxLength={STAGE_NAME_MAX}
            disabled={disabled}
            aria-label={`Nombre de la columna ${index + 1}`}
            className={cn(!stage.active && 'text-muted-foreground')}
            {...register(`stages.${index}.name`)}
          />
          {rowErrors?.name && <p className="text-xs text-destructive">{rowErrors.name.message}</p>}
        </div>

        <Select
          value={stage.category}
          disabled={disabled}
          // Radix dispara onValueChange("") al montar una fila nueva (su <select>
          // oculto todavía no tiene opciones): se ignora para no borrar el tipo.
          onValueChange={(value) => {
            if (!value) return;
            onChange({ category: value as StageCategory });
          }}
        >
          <SelectTrigger className="w-32" aria-label={`Tipo de ${label}`}>
            {/* Etiqueta explícita: misma razón que en Nueva cotización (Radix
                puede dejar el campo en blanco si la opción se montó después). */}
            <SelectValue>{STAGE_CATEGORY_LABEL[stage.category]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(([value, text]) => (
              <SelectItem key={value} value={value}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Ancho fijo en pantallas medianas: así el nombre y el tipo quedan
            alineados entre filas aunque cambien las etiquetas de la derecha. */}
        <div className="flex h-9 items-center justify-end gap-1.5 sm:w-56">
          {isNew ? (
            <Badge variant="default">Nueva</Badge>
          ) : (
            <Badge variant="muted" title="Productos que hoy están en esta columna">
              {stage.itemCount} {stage.itemCount === 1 ? 'producto' : 'productos'}
            </Badge>
          )}
          {!stage.active && <Badge variant="warning">Desactivada</Badge>}
          {isNew ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={disabled}
              onClick={onRemove}
              aria-label={`Quitar ${label}`}
              title="Quitar (todavía no se guardó)"
            >
              <X className="size-4" />
            </Button>
          ) : (
            <ToggleStatusButton
              active={stage.active}
              disabled={disabled}
              entityLabel={`la columna ${label}`}
              onToggle={() => onChange({ active: !stage.active, moveItemsToStageId: null })}
            />
          )}
        </div>
      </div>

      {needsMoveTarget(stage) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-warning/10 px-2.5 py-2 text-xs">
          <span>
            Sus {stage.itemCount} {stage.itemCount === 1 ? 'producto pasa' : 'productos pasan'} a:
          </span>
          <Select
            value={stage.moveItemsToStageId ? String(stage.moveItemsToStageId) : undefined}
            disabled={disabled}
            onValueChange={(value) => {
              if (!value) return;
              onChange({ moveItemsToStageId: Number(value) });
            }}
          >
            <SelectTrigger className="h-8 w-48 bg-background" aria-label={`Columna destino de ${label}`}>
              <SelectValue placeholder="Elige una columna" />
            </SelectTrigger>
            <SelectContent>
              {moveTargets.map((target) => (
                <SelectItem key={target.stageId} value={String(target.stageId)}>
                  {target.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rowErrors?.moveItemsToStageId && (
            <span className="text-destructive">{rowErrors.moveItemsToStageId.message}</span>
          )}
        </div>
      )}
    </li>
  );
}
