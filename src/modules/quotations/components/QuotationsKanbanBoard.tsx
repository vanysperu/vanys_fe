import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { AcceptQuotationDialog, type AcceptQuotationTarget } from '@/modules/quotations/components/AcceptQuotationDialog';
import { FinishQuotationDialog, type FinishQuotationTarget } from '@/modules/quotations/components/FinishQuotationDialog';
import { shouldAskForAdvance } from '@/modules/quotations/utils/advancePayment';
import {
  useChangeQuotationStatusAny,
  useQuotationBoard,
  useQuotationBoardColumnMore,
} from '@/modules/quotations/hooks/useQuotations';
import {
  getKanbanDropTargets,
  QUOTATION_STATUS_COLOR,
  QUOTATION_STATUS_LABEL,
  type Quotation,
  type QuotationBoardColumn,
  type QuotationBoardParams,
  type QuotationStatus,
} from '@/modules/quotations/types/quotation.types';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Alto fijo del tablero (pedido explícito del usuario: "debe tener un tamaño
// máximo y cada columna scroll"): ocupa la pantalla bajo el encabezado y los
// filtros, y cada columna se desplaza sola. En pantallas bajas no baja de 26rem.
const BOARD_HEIGHT = 'h-[calc(100dvh-17rem)] min-h-[26rem]';

interface QuotationsKanbanBoardProps {
  filters: QuotationBoardParams;
  onSelect: (id: number) => void;
  canChangeStatus: boolean;
  // Recarga sola cada N ms (Inicio). Sin él, como siempre.
  refetchInterval?: number;
}

interface DraggedQuotation {
  quotation: Quotation;
}

// Tablero de cotizaciones por estado: cada columna es un paso de la cadena
// principal (quote_requested -> pending -> accepted -> design_pending -> in_process -> ready
// -> delivered -> finished). Cada columna trae SUS cotizaciones (GET
// /quotation/board), de la que llegó a ese estado más recientemente a la más
// antigua: una cotización recién pasada a Pendiente sale arriba de Pendiente
// (antes se ordenaba por creación y se perdía en la columna, pedido explícito
// del usuario). Arrastrar una tarjeta solo se acepta si la columna destino es
// la inmediatamente anterior o siguiente a la actual — el backend
// (quotation.service.ts) lo vuelve a validar y es quien manda.
export function QuotationsKanbanBoard({ filters, onSelect, canChangeStatus, refetchInterval }: QuotationsKanbanBoardProps) {
  const { data: board, isLoading } = useQuotationBoard(filters, { refetchInterval });
  const [activeQuotation, setActiveQuotation] = useState<Quotation | null>(null);
  const { mutate: changeStatus } = useChangeQuotationStatusAny();
  const canRegisterPayment = usePermissionButton('cotizacion.payment.create.button');
  // Tarjeta soltada en "Aceptada": primero se pregunta por el adelanto.
  const [accepting, setAccepting] = useState<AcceptQuotationTarget | null>(null);
  // Tarjeta soltada en "Finalizada": primero se pregunta por la factura.
  const [finishing, setFinishing] = useState<FinishQuotationTarget | null>(null);
  // Mouse: arrastra tras moverse 6 px. Dedo: arrastra solo con pulsación larga
  // (250 ms), así deslizar sobre una tarjeta sigue desplazando la columna.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  // Cada tarjeta lleva su cotización en `data`: las columnas cargan por su
  // cuenta ("Ver más"), así que el tablero no tiene una lista única donde buscarla.
  const draggedOf = (data: unknown): Quotation | null => (data as DraggedQuotation | undefined)?.quotation ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveQuotation(draggedOf(event.active.data.current));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveQuotation(null);
    const { active, over } = event;
    const quotation = draggedOf(active.data.current);
    if (!over || !quotation) return;

    const nextStatus = over.id as QuotationStatus;
    if (quotation.status === nextStatus) return;

    if (!getKanbanDropTargets(quotation.status).includes(nextStatus)) {
      toast.error('No puedes saltarte pasos del flujo — solo puedes mover una cotización a la etapa anterior o siguiente.');
      return;
    }

    const askForAdvance = shouldAskForAdvance({
      currentStatus: quotation.status,
      nextStatus,
      balance: Number(quotation.total) - Number(quotation.total_paid),
      canRegisterPayment,
    });
    if (askForAdvance) {
      setAccepting({
        id: quotation.id,
        total: Number(quotation.total),
        total_paid: Number(quotation.total_paid),
        clientName: quotation.client?.name,
      });
      return;
    }

    if (nextStatus === 'finished') {
      setFinishing({ id: quotation.id, clientName: quotation.client?.name });
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

  if (isLoading) {
    return (
      <div className={cn('flex gap-3 overflow-hidden', BOARD_HEIGHT)}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-full w-72 shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  const columns = board?.columns ?? [];
  if (columns.every((column) => column.total_count === 0)) {
    return <EmptyState icon={Layers} title="No se encontraron cotizaciones" />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={cn('scrollbar-thin flex gap-3 overflow-x-auto pb-2', BOARD_HEIGHT)} data-testid="quotations-board">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            column={column}
            filters={filters}
            onSelect={onSelect}
            draggable={canChangeStatus}
          />
        ))}
      </div>

      <DragOverlay>{activeQuotation && <QuotationCard quotation={activeQuotation} dragging />}</DragOverlay>
      <AcceptQuotationDialog quotation={accepting} onClose={() => setAccepting(null)} />
      <FinishQuotationDialog quotation={finishing} onClose={() => setFinishing(null)} />
    </DndContext>
  );
}

function KanbanColumn({
  column,
  filters,
  onSelect,
  draggable,
}: {
  column: QuotationBoardColumn;
  filters: QuotationBoardParams;
  onSelect: (id: number) => void;
  draggable: boolean;
}) {
  const { status, total_count: totalCount, total_amount: totalAmount } = column;
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = QUOTATION_STATUS_COLOR[status];
  // "Ver más": recién al abrirlo se piden las páginas siguientes de la columna.
  const [showMore, setShowMore] = useState(false);
  const more = useQuotationBoardColumnMore(status, filters, showMore);

  // Al cambiar de estado una tarjeta, las páginas se recargan y una misma
  // cotización podría venir dos veces por un instante: se muestra una sola vez.
  const seen = new Set<number>();
  const quotes = [...column.data, ...(more.data?.pages.flatMap((page) => page.data) ?? [])].filter((quotation) => {
    if (seen.has(quotation.id)) return false;
    seen.add(quotation.id);
    return true;
  });
  const remaining = Math.max(totalCount - quotes.length, 0);

  const loadMore = () => {
    if (!showMore) {
      setShowMore(true);
      return;
    }
    void more.fetchNextPage();
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 shrink-0 flex-col rounded-xl border bg-muted/20 transition-colors',
        isOver && 'border-primary bg-primary/5',
      )}
      data-testid={`kanban-column-${status}`}
    >
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <span
          className="inline-flex h-[19px] items-center rounded-md px-2 text-[10px] font-bold"
          style={{ color: color.fg, background: color.bg }}
        >
          {QUOTATION_STATUS_LABEL[status]}
        </span>
        {/* Totales de TODA la columna, no solo de las tarjetas cargadas. */}
        <span className="font-mono-nums text-[11px] text-muted-foreground" data-testid={`kanban-count-${status}`}>
          {totalCount}
        </span>
        <span className="font-mono-nums ml-auto text-[11px] font-semibold text-muted-foreground">{money(totalAmount)}</span>
      </div>

      <div className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
        {quotes.length === 0 && (
          <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
            Sin cotizaciones
          </div>
        )}
        {quotes.map((quotation) => (
          <DraggableQuotationCard key={quotation.id} quotation={quotation} onSelect={onSelect} draggable={draggable} />
        ))}
        {remaining > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs text-muted-foreground"
            disabled={more.isFetching}
            onClick={loadMore}
            data-testid={`kanban-more-${status}`}
          >
            <ChevronDown className="size-3.5" />
            {more.isFetching ? 'Cargando…' : `Ver más (${remaining})`}
          </Button>
        )}
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
    data: { quotation } satisfies DraggedQuotation,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), touchAction: 'manipulation' }}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      className={cn('shrink-0', isDragging && 'opacity-30')}
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
