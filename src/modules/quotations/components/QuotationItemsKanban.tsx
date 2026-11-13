import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useWorkflowBoard } from '@/modules/productionWorkflow/hooks/useProductionWorkflow';
import type { WorkflowRules, WorkflowStage } from '@/modules/productionWorkflow/types/productionWorkflow.types';
import { useChangeQuotationItemStage } from '@/modules/quotations/hooks/useQuotations';
import type { QuotationItem } from '@/modules/quotations/types/quotation.types';
import type { ApiClientError } from '@/config/api.types';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

interface QuotationItemsKanbanProps {
  quotationId: number;
  items: QuotationItem[];
  companyId: number;
  canMoveStage: boolean;
}

// Columna fija para productos sin etapa o en una columna que se desactivó
// (no se puede soltar nada ahí: solo se sale de ella).
const NO_STAGE_COLUMN: WorkflowStage = {
  id: 0,
  name: 'Sin etapa',
  color: '#94A3B8',
  position: -1,
  category: 'todo',
  active: true,
};

// Misma regla que el backend (production_workflow/services/shared/stage_rules.ts),
// solo para avisar al instante y marcar a qué columnas se puede soltar: quien
// decide de verdad es el backend.
const moveBlockReason = (rules: WorkflowRules, stages: WorkflowStage[], fromStageId: number | null, toStageId: number) => {
  const toIndex = stages.findIndex((stage) => stage.id === toStageId);
  if (toIndex === -1) return 'Esa columna ya no está activa';
  if (rules.flowMode === 'free') return null;

  const fromIndex = stages.findIndex((stage) => stage.id === fromStageId);
  if (fromIndex === -1) return toIndex === 0 ? null : 'Este producto tiene que empezar por la primera columna';
  if (toIndex === fromIndex + 1) return null;
  if (rules.allowBackward && toIndex === fromIndex - 1) return null;
  return rules.allowBackward
    ? 'Solo puedes mover un producto a la columna anterior o siguiente — no se puede saltar columnas.'
    : 'Solo puedes mover un producto a la columna siguiente.';
};

// Mini-kanban de los productos de UNA cotización, por etapa de producción. Las
// columnas, su orden y cómo se avanza (lineal o libre) los configura cada
// empresa en "Flujo de producción" (Sprint 2, ítem 5).
export function QuotationItemsKanban({ quotationId, items, companyId, canMoveStage }: QuotationItemsKanbanProps) {
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const { data: board, isLoading } = useWorkflowBoard(companyId);
  const { mutate: changeStage } = useChangeQuotationItemStage(quotationId);
  // Mouse: arrastra tras moverse 6 px (igual que antes). Dedo: arrastra solo
  // con pulsación larga (250 ms), así deslizar sobre una tarjeta sigue
  // desplazando el tablero/la página en vez de agarrar la tarjeta.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  if (isLoading || !board) {
    return <Skeleton className="h-40 w-full" />;
  }

  const stages = board.stages;
  const stageIds = new Set(stages.map((stage) => stage.id));
  const withoutStage = items.filter((item) => item.stage_id === null || !stageIds.has(item.stage_id));
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;

  // "item-" / "stage-" al armar los id de dnd-kit: quotation_item.id y el id
  // de la columna son secuencias de tablas distintas y tarde o temprano
  // coinciden numéricamente — sin este prefijo, dnd-kit podía confundir la
  // tarjeta que se arrastra con la columna destino y el drop no hacía nada.
  const handleDragStart = (event: DragStartEvent) => setActiveItemId(Number(String(event.active.id).replace('item-', '')));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItemId(null);
    const { active, over } = event;
    if (!over) return;

    const item = items.find((row) => row.id === Number(String(active.id).replace('item-', '')));
    const nextStageId = Number(String(over.id).replace('stage-', ''));
    if (!item || item.stage_id === nextStageId) return;

    const blockReason = moveBlockReason(board, stages, item.stage_id, nextStageId);
    if (blockReason) {
      toast.error(blockReason);
      return;
    }

    const nextStage = stages.find((stage) => stage.id === nextStageId);
    changeStage(
      { itemId: item.id, stageId: nextStageId },
      {
        onSuccess: () => toast.success(`Producto movido a "${nextStage?.name ?? ''}"`),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  // Mientras se arrastra, se resaltan las columnas donde se puede soltar.
  const canDropOn = (stageId: number) =>
    activeItem !== null && activeItem.stage_id !== stageId && moveBlockReason(board, stages, activeItem.stage_id, stageId) === null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
        {withoutStage.length > 0 && (
          <StageColumn stage={NO_STAGE_COLUMN} items={withoutStage} draggable={canMoveStage} droppable={false} dragging={activeItem !== null} />
        )}
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            items={items.filter((item) => item.stage_id === stage.id)}
            draggable={canMoveStage}
            droppable={canDropOn(stage.id)}
            dragging={activeItem !== null}
          />
        ))}
      </div>
      {/* En document.body: este tablero vive dentro de un diálogo centrado con
          transform, y ahí el position: fixed del overlay se mide desde el diálogo
          y no desde la pantalla. La tarjeta salía lejos del cursor y, como dnd-kit
          detecta la columna con ese rectángulo, no se podía soltar en otra. */}
      {createPortal(<DragOverlay>{activeItem && <ItemCard item={activeItem} dragging />}</DragOverlay>, document.body)}
    </DndContext>
  );
}

function StageColumn({
  stage,
  items,
  draggable,
  droppable,
  dragging,
}: {
  stage: WorkflowStage;
  items: QuotationItem[];
  draggable: boolean;
  // Se puede soltar aquí el producto que se está arrastrando.
  droppable: boolean;
  dragging: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}`, disabled: stage.id === NO_STAGE_COLUMN.id });

  return (
    <div
      ref={setNodeRef}
      data-testid="kanban-stage-column"
      className={cn(
        'flex w-56 shrink-0 flex-col rounded-lg border bg-muted/20 transition-[colors,opacity]',
        dragging && droppable && 'border-dashed border-primary/60',
        dragging && !droppable && 'opacity-50',
        isOver && droppable && 'border-solid border-primary bg-primary/5',
      )}
    >
      <div className="flex items-center gap-2 border-b px-2.5 py-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: stage.color }} />
        <span className="truncate text-xs font-semibold">{stage.name}</span>
        {stage.category === 'done' && stage.id !== NO_STAGE_COLUMN.id && (
          <CircleCheck className="size-3.5 shrink-0 text-[var(--success)]" aria-label="Columna final" />
        )}
        <span className="font-mono-nums ml-auto text-[10.5px] text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed py-4 text-center text-[10.5px] text-muted-foreground">
            Vacío
          </div>
        )}
        {items.map((item) => (
          <DraggableItemCard key={item.id} item={item} draggable={draggable} />
        ))}
      </div>
    </div>
  );
}

function DraggableItemCard({ item, draggable }: { item: QuotationItem; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `item-${item.id}`,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      // touch-action: manipulation (no 'none'): con 'none' un dedo sobre la
      // tarjeta no podía desplazar la página ni el tablero en el celular. El
      // arrastre táctil lo resuelve el TouchSensor con pulsación larga.
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'manipulation' }}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={cn(isDragging && 'opacity-30')}
    >
      <ItemCard item={item} />
    </div>
  );
}

function ItemCard({ item, dragging = false }: { item: QuotationItem; dragging?: boolean }) {
  return (
    <div
      className={cn(
        'cursor-grab space-y-0.5 rounded-md border bg-card px-2 py-1.5 shadow-sm select-none active:cursor-grabbing',
        dragging && 'shadow-lg ring-2 ring-primary',
      )}
    >
      <p className="truncate text-[11.5px] font-medium">{item.product?.name ?? '—'}</p>
      {/* Producción necesita ver el color de cada lote. */}
      <p className="truncate text-[10.5px] text-muted-foreground">
        Cant. {item.quantity}
        {item.color ? ` · ${item.color}` : ''}
      </p>
    </div>
  );
}
