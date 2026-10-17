import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useChangeQuotationStatusAny } from '@/modules/quotations/hooks/useQuotations';
import {
  getKanbanDropTargets,
  QUOTATION_MAIN_CHAIN,
  QUOTATION_STATUS_COLOR,
  QUOTATION_STATUS_LABEL,
  type Quotation,
  type QuotationStatus,
} from '@/modules/quotations/types/quotation.types';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import type { ApiClientError } from '@/config/api.types';
import { Layers } from 'lucide-react';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuotationsKanbanBoardProps {
  quotations: Quotation[];
  onSelect: (id: number) => void;
  canChangeStatus: boolean;
}

// Tablero de cotizaciones por estado: cada columna es un paso de la cadena
// principal (pending -> accepted -> design_pending -> in_process -> ready
// -> delivered -> finished). Arrastrar una tarjeta solo se acepta si la
// columna destino es la inmediatamente anterior o siguiente a la actual —
// el mismo backend (quotation.service.ts) vuelve a validar esto y es quien
// manda: si se suelta en una columna no adyacente, el request se rechaza y
// la tarjeta simplemente no se mueve (no hay estado optimista que revertir).
export function QuotationsKanbanBoard({ quotations, onSelect, canChangeStatus }: QuotationsKanbanBoardProps) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const { mutate: changeStatus } = useChangeQuotationStatusAny();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = QUOTATION_MAIN_CHAIN.map((status) => ({
    status,
    quotes: quotations.filter((q) => q.status === status),
  }));

  const activeQuotation = quotations.find((q) => q.id === activeId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const quotation = quotations.find((q) => q.id === Number(active.id));
    const nextStatus = over.id as QuotationStatus;
    if (!quotation || quotation.status === nextStatus) return;

    if (!getKanbanDropTargets(quotation.status).includes(nextStatus)) {
      toast.error('No puedes saltarte pasos del flujo — solo puedes mover una cotización a la etapa anterior o siguiente.');
      return;
    }

    changeStatus(
      { id: quotation.id, status: nextStatus },
      {
        onSuccess: () => toast.success(`Cotización movida a "${QUOTATION_STATUS_LABEL[nextStatus]}"`),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  if (quotations.length === 0) {
    return <EmptyState icon={Layers} title="No se encontraron cotizaciones" />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="scrollbar-thin flex gap-3 overflow-x-auto pb-2">
        {columns.map(({ status, quotes }) => (
          <KanbanColumn
            key={status}
            status={status}
            quotes={quotes}
            onSelect={onSelect}
            draggable={canChangeStatus}
          />
        ))}
      </div>

      <DragOverlay>{activeQuotation && <QuotationCard quotation={activeQuotation} dragging />}</DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  quotes,
  onSelect,
  draggable,
}: {
  status: QuotationStatus;
  quotes: Quotation[];
  onSelect: (id: number) => void;
  draggable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = QUOTATION_STATUS_COLOR[status];
  const columnTotal = quotes.reduce((sum, q) => sum + Number(q.total), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/20 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span
          className="inline-flex h-[19px] items-center rounded-md px-2 text-[10px] font-bold"
          style={{ color: color.fg, background: color.bg }}
        >
          {QUOTATION_STATUS_LABEL[status]}
        </span>
        <span className="font-mono-nums text-[11px] text-muted-foreground">{quotes.length}</span>
        <span className="font-mono-nums ml-auto text-[11px] font-semibold text-muted-foreground">
          {money(columnTotal)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-2">
        {quotes.length === 0 && (
          <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            Sin cotizaciones
          </div>
        )}
        {quotes.map((quotation) => (
          <DraggableQuotationCard key={quotation.id} quotation={quotation} onSelect={onSelect} draggable={draggable} />
        ))}
      </div>
    </div>
  );
}

function DraggableQuotationCard({
  quotation,
  onSelect,
  draggable,
}: {
  quotation: Quotation;
  onSelect: (id: number) => void;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quotation.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'none' }}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={cn(isDragging && 'opacity-30')}
    >
      <QuotationCard quotation={quotation} onClick={() => onSelect(quotation.id)} />
    </div>
  );
}

function QuotationCard({
  quotation,
  onClick,
  dragging = false,
}: {
  quotation: Quotation;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const balance = Number(quotation.total) - Number(quotation.total_paid);
  const pct = quotation.total > 0 ? Math.round((Number(quotation.total_paid) / Number(quotation.total)) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-grab space-y-2 rounded-lg border bg-card p-3 shadow-sm select-none active:cursor-grabbing',
        dragging && 'shadow-lg ring-2 ring-primary',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono-nums text-[11px] font-semibold text-primary">
          COT-{String(quotation.id).padStart(4, '0')}
        </span>
        <span className="font-mono-nums text-xs font-semibold">{money(quotation.total)}</span>
      </div>
      <p className="truncate text-[12.5px] font-medium">{quotation.client?.name ?? '—'}</p>
      <div className="space-y-1">
        <span className="block h-1 w-full overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? 'var(--success)' : pct > 0 ? 'var(--primary)' : 'var(--border)',
            }}
          />
        </span>
        <p className="font-mono-nums text-[10.5px] text-muted-foreground">Saldo: {money(balance)}</p>
      </div>
    </div>
  );
}
