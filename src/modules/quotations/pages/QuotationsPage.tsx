import { LayoutGrid, List } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { CreateQuotationDialog } from '@/modules/quotations/components/CreateQuotationDialog';
import { QuotationDetailDialog } from '@/modules/quotations/components/QuotationDetailDialog';
import { QuotationPdfPreviewDialog } from '@/modules/quotations/components/QuotationPdfPreviewDialog';
import { QuotationsByStatus, type QuotationQuickActionTab } from '@/modules/quotations/components/QuotationsByStatus';
import { QuotationsKanbanBoard } from '@/modules/quotations/components/QuotationsKanbanBoard';
import { useQuotations } from '@/modules/quotations/hooks/useQuotations';
import { QUOTATION_STATUS_LABEL, type QuotationStatus } from '@/modules/quotations/types/quotation.types';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const ALL_STATUS_VALUE = 'all';
type ViewMode = 'list' | 'board';

export function QuotationsPage() {
  const [status, setStatus] = useState<QuotationStatus | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [initialTab, setInitialTab] = useState<QuotationQuickActionTab | 'products'>('products');
  const [view, setView] = useState<ViewMode>('board');
  const canCreate = usePermissionButton('cotizacion.create.button');
  const canChangeStatus = usePermissionButton('cotizacion.changeStatus.button');

  // Mismo componente de lista agrupada que el Panel principal — se pide un
  // límite alto porque el agrupamiento por estado es del lado del cliente
  // (ver QuotationsByStatus); paginar por grupo queda para cuando el
  // volumen real lo justifique. El tablero Kanban necesita ver TODOS los
  // estados a la vez (son las columnas), así que ignora el filtro mientras
  // esa vista está activa.
  const { data, isLoading } = useQuotations({ page: 1, limit: 200, status: view === 'board' ? undefined : status });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones"
        description="Flujo completo: pendiente → aceptada → diseño → producción → entrega"
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border p-0.5">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <List className="size-3.5" /> Lista
              </button>
              <button
                type="button"
                onClick={() => setView('board')}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  view === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <LayoutGrid className="size-3.5" /> Tablero
              </button>
            </div>
            {view === 'list' && (
              <Select
                value={status ?? ALL_STATUS_VALUE}
                onValueChange={(value) => setStatus(value === ALL_STATUS_VALUE ? undefined : (value as QuotationStatus))}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS_VALUE}>Todos los estados</SelectItem>
                  {Object.entries(QUOTATION_STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {canCreate && <CreateQuotationDialog />}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : view === 'list' ? (
        <QuotationsByStatus
          quotations={data?.data ?? []}
          onSelect={(id) => {
            setInitialTab('products');
            setSelectedId(id);
          }}
          onQuickAction={(id, tab) => {
            setInitialTab(tab);
            setSelectedId(id);
          }}
          onPreviewPdf={setPreviewId}
        />
      ) : (
        <QuotationsKanbanBoard
          quotations={data?.data ?? []}
          onSelect={setSelectedId}
          canChangeStatus={canChangeStatus}
        />
      )}

      <QuotationDetailDialog
        quotationId={selectedId}
        initialTab={initialTab}
        onClose={() => setSelectedId(null)}
      />
      <QuotationPdfPreviewDialog quotationId={previewId} onClose={() => setPreviewId(null)} />
    </div>
  );
}
