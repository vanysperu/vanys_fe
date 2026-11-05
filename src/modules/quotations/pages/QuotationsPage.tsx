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
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { useClients } from '@/modules/clients/hooks/useClients';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';

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
  const [clientFilter, setClientFilter] = useState<string | undefined>(undefined);
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const { data: access } = useAccess();
  // Filtro por tienda solo para quien administra tiendas (mismo criterio que
  // CreateQuotationDialog): a un Gestor el backend ya lo limita a la suya.
  const canFilterByStore = !access?.isSystem && Boolean(access?.modules.includes('platform'));
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canFilterByStore });
  const { data: clients } = useClients({ page: 1, limit: 100 });

  // Filtros compartidos por las dos vistas.
  const filters = {
    clientId: clientFilter ? Number(clientFilter) : undefined,
    businessUnitId: businessUnitFilter ? Number(businessUnitFilter) : undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  };

  // Lista: mismo componente de lista agrupada que el Panel principal, con las
  // 100 más recientes (el máximo del backend). Primero lo que cambió de estado
  // más recientemente (pedido explícito del usuario: una cotización recién
  // pasada a Pendiente no aparecía). El tablero pide sus columnas aparte
  // (QuotationsKanbanBoard), así que esta lista solo se carga en la vista Lista.
  const { data, isLoading } = useQuotations(
    { ...filters, page: 1, limit: 100, status, orderBy: 'status_changed_at', orderDir: 'desc' },
    { enabled: view === 'list' },
  );

  const hasActiveFilters = Boolean(clientFilter || businessUnitFilter || dateRange.dateFrom || dateRange.dateTo);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones"
        description="Flujo completo: pendiente de cotizar → pendiente → aceptada → diseño → producción → entrega"
        action={
          // flex-wrap: en el celular Lista/Tablero + estado + crear no entran
          // en una fila y se salían de la pantalla.
          <div className="flex flex-wrap items-center gap-3">
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
                <SelectTrigger className="w-44 sm:w-56">
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

      {/* Cliente, tienda y fecha de emisión filtran en las dos vistas (lista
          y tablero); el estado solo en la lista, porque en el tablero cada
          estado ya es una columna. */}
      <FiltersBar
        hasActiveFilters={hasActiveFilters}
        onClear={() => {
          setClientFilter(undefined);
          setBusinessUnitFilter(undefined);
          setDateRange({});
        }}
      >
        <FilterSelect
          aria-label="Cliente"
          allLabel="Todos los clientes"
          className="w-56"
          value={clientFilter}
          onChange={setClientFilter}
          options={(clients?.data ?? []).map((client) => ({ value: String(client.id), label: client.name }))}
        />
        {canFilterByStore && (
          <FilterSelect
            aria-label="Tienda"
            allLabel="Todas las tiendas"
            value={businessUnitFilter}
            onChange={setBusinessUnitFilter}
            options={(businessUnits?.data ?? []).map((unit) => ({ value: String(unit.id), label: unit.business_code }))}
          />
        )}
        <DateRangeFilter placeholder="Fecha de emisión" value={dateRange} onChange={setDateRange} />
      </FiltersBar>

      {view === 'board' ? (
        <QuotationsKanbanBoard filters={filters} onSelect={setSelectedId} canChangeStatus={canChangeStatus} />
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
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
