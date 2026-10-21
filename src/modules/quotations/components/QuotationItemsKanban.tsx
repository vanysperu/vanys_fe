import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useChangeQuotationItemStage } from '@/modules/quotations/hooks/useQuotations';
import type { QuotationItem, QuotationItemStage } from '@/modules/quotations/types/quotation.types';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import type { ApiClientError } from '@/config/api.types';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

interface QuotationItemsKanbanProps {
  quotationId: number;
  items: QuotationItem[];
  companyId: number;
  canMoveStage: boolean;
}

const byPosition = (a: QuotationItemStage, b: QuotationItemStage) => Number(a.ref2 ?? 0) - Number(b.ref2 ?? 0);

// Mini-kanban de los productos de UNA cotización, por etapa de producción.
// Las etapas son configurables por empresa (filas de general_variable,
// category="production_stage" — ver Variables Generales), así que las
// columnas se arman en vivo desde ahí, no de un enum fijo. Arrastrar un
// producto solo se acepta a la etapa inmediatamente anterior/siguiente
// dentro de ese orden — el backend (quotation_item.service.ts) es quien
// valida esto de verdad.
export function QuotationItemsKanban({ quotationId, items, companyId, canMoveStage }: QuotationItemsKanbanProps) {
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const { data: stagesResult, isLoading } = useVariableGenerals({
    category: 'production_stage',
    ignorePagination: true,
  });
  const { mutate: changeStage } = useChangeQuotationItemStage(quotationId);
  // Mouse: arrastra tras moverse 6 px (igual que antes). Dedo: arrastra solo
  // con pulsación larga (250 ms), así deslizar sobre una tarjeta sigue
  // desplazando el tablero/la página en vez de agarrar la tarjeta.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  const stages = (stagesResult?.data ?? [])
    .filter((row) => row.company_id === null || row.company_id === companyId)
    .map((row) => ({ id: row.id, name: row.name, ref1: row.ref1, ref2: row.ref2 }))
    .sort(byPosition);

  if (stages.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Esta empresa todavía no configuró etapas de producción (Variables Generales → categoría
        "production_stage").
      </p>
    );
  }

  const stageIndex = (stageId: number | null) => stages.findIndex((stage) => stage.id === stageId);
  const activeItem = items.find((item) => item.id === activeItemId) ?? null;

  // "item-" / "stage-" al armar los id de dnd-kit: quotation_item.id y
  // general_variable.id son secuencias de tablas distintas y tarde o
  // temprano coinciden numéricamente (ej. ambos con id 13) — sin este
  // prefijo, dnd-kit podía confundir la tarjeta que se arrastra con la
  // columna destino cuando compartían el mismo número, y el drop
  // simplemente no hacía nada (el bug de "el kanban no funciona").
  const handleDragStart = (event: DragStartEvent) => setActiveItemId(Number(String(event.active.id).replace('item-', '')));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItemId(null);
    const { active, over } = event;
    if (!over) return;

    const item = items.find((row) => row.id === Number(String(active.id).replace('item-', '')));
    const nextStageId = Number(String(over.id).replace('stage-', ''));
    if (!item || item.stage_id === nextStageId) return;

    const currentIndex = stageIndex(item.stage_id);
    const nextIndex = stageIndex(nextStageId);
    const isAdjacent = currentIndex === -1 ? nextIndex === 0 : Math.abs(nextIndex - currentIndex) === 1;

    if (!isAdjacent) {
      toast.error('Solo puedes mover un producto a la etapa anterior o siguiente — no se puede saltar etapas.');
      return;
    }

    changeStage(
      { itemId: item.id, stageId: nextStageId },
      {
        onSuccess: () => toast.success(`Producto movido a "${stages[nextIndex]?.name ?? ''}"`),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            items={items.filter((item) => item.stage_id === stage.id)}
            draggable={canMoveStage}
          />
        ))}
      </div>
      <DragOverlay>{activeItem && <ItemCard item={activeItem} dragging />}</DragOverlay>
    </DndContext>
  );
}

function StageColumn({
  stage,
  items,
  draggable,
}: {
  stage: QuotationItemStage;
  items: QuotationItem[];
  draggable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stage.id}` });

  return (
    <div
      ref={setNodeRef}
      className={cn('flex w-56 shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors', isOver && 'border-primary bg-primary/5')}
    >
      <div className="flex items-center gap-2 border-b px-2.5 py-2">
        <span className="size-2 shrink-0 rounded-full" style={{ background: stage.ref1 ?? '#94a3b8' }} />
        <span className="truncate text-xs font-semibold">{stage.name}</span>
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
      <p className="text-[10.5px] text-muted-foreground">Cant. {item.quantity}</p>
    </div>
  );
}
