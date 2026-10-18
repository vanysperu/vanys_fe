import { Eye, HandCoins, Receipt, Search } from 'lucide-react';
import { useState } from 'react';

import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { QuotationDetailDialog } from '@/modules/quotations/components/QuotationDetailDialog';
import { QUOTATION_STATUS_COLOR, QUOTATION_STATUS_LABEL, type QuotationStatus } from '@/modules/quotations/types/quotation.types';
import { useReceivables } from '@/modules/receivables/hooks/useReceivables';
import {
  RECEIVABLE_STATUSES,
  type ReceivableListItem,
  type ReceivableOrderBy,
} from '@/modules/receivables/types/receivable.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formatDateOnly = (value: string) => new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('es-PE');

// "Lo que me falta cobrar" (pedido explícito del usuario): cotizaciones
// aceptadas (o más avanzadas) con saldo pendiente. Por defecto, la más
// antigua primero — es la que más urge cobrar.
export function ReceivablesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [clientName, setClientName] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [sortBy, setSortBy] = useState<ReceivableOrderBy>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: access } = useAccess();
  const canRegisterPayment = usePermissionButton('cotizacion.payment.create.button');
  // Mismo criterio que Cotizaciones: el selector de tienda solo sirve a quien
  // no está limitado a una (el backend igual lo revalida).
  const canFilterByStore = !access?.isSystem && Boolean(access?.modules.includes('platform'));
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canFilterByStore });

  const { data, isLoading } = useReceivables({
    page,
    limit: pageSize,
    clientName: clientName.trim() || undefined,
    status: statusFilter as QuotationStatus | undefined,
    businessUnitId: businessUnitFilter ? Number(businessUnitFilter) : undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
    orderBy: sortBy,
    orderDir: sortDir,
  });

  const hasActiveFilters = Boolean(
    clientName || statusFilter || businessUnitFilter || dateRange.dateFrom || dateRange.dateTo,
  );
  const clearFilters = () => {
    setClientName('');
    setStatusFilter(undefined);
    setBusinessUnitFilter(undefined);
    setDateRange({});
    setPage(1);
  };
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Por cobrar" description="Saldos pendientes de las cotizaciones que el cliente ya aceptó" />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Total por cobrar</p>
          <p className="text-2xl font-semibold text-destructive" data-testid="receivables-total">
            {money(data?.summary.total_balance ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Cotizaciones con saldo</p>
          <p className="text-2xl font-semibold" data-testid="receivables-count">
            {data?.summary.quotation_count ?? 0}
          </p>
        </div>
      </div>

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="h-9 w-56 pl-9"
            value={clientName}
            onChange={(event) => withPageReset(setClientName)(event.target.value)}
          />
        </div>
        <FilterSelect
          aria-label="Estado"
          allLabel="Todos los estados"
          value={statusFilter}
          onChange={withPageReset(setStatusFilter)}
          options={RECEIVABLE_STATUSES.map((status) => ({ value: status, label: QUOTATION_STATUS_LABEL[status] }))}
        />
        {canFilterByStore && (
          <FilterSelect
            aria-label="Tienda"
            allLabel="Todas las tiendas"
            value={businessUnitFilter}
            onChange={withPageReset(setBusinessUnitFilter)}
            options={(businessUnits?.data ?? []).map((unit) => ({ value: String(unit.id), label: unit.business_code }))}
          />
        )}
        <DateRangeFilter placeholder="Fecha de emisión" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<ReceivableListItem>
        sortBy={sortBy}
        sortDir={sortDir}
        onSortChange={(key, dir) => {
          // Sin orden elegido se vuelve al de por defecto (más antigua primero).
          setSortBy((dir ? key : 'created_at') as ReceivableOrderBy);
          setSortDir(dir ?? 'asc');
          setPage(1);
        }}
        columns={[
          {
            header: 'Cotización',
            cell: (row) => (
              <span className="font-mono-nums text-xs font-semibold text-primary">
                COT-{String(row.quotation_id).padStart(4, '0')}
              </span>
            ),
          },
          { header: 'Cliente', cell: (row) => <span className="font-medium">{row.client_name}</span> },
          {
            header: 'Estado',
            cell: (row) => {
              const color = QUOTATION_STATUS_COLOR[row.status];
              return (
                <span
                  className="inline-flex h-[19px] items-center rounded-md px-2 text-[10px] font-bold"
                  style={{ color: color.fg, background: color.bg }}
                >
                  {QUOTATION_STATUS_LABEL[row.status]}
                </span>
              );
            },
          },
          {
            header: 'Emitida',
            sortable: true,
            sortKey: 'created_at',
            cell: (row) => new Date(row.created_at).toLocaleDateString('es-PE'),
          },
          {
            header: 'Total',
            align: 'right',
            sortable: true,
            sortKey: 'total',
            cell: (row) => <span className="whitespace-nowrap">{money(row.total)}</span>,
          },
          {
            header: 'Cobrado',
            align: 'right',
            cell: (row) => <span className="whitespace-nowrap text-[var(--success)]">{money(row.total_paid)}</span>,
          },
          {
            header: 'Saldo',
            align: 'right',
            sortable: true,
            sortKey: 'balance',
            cell: (row) => <span className="whitespace-nowrap font-semibold text-destructive">{money(row.balance)}</span>,
          },
          {
            header: 'Último pago',
            cell: (row) => (row.last_paid_at ? formatDateOnly(row.last_paid_at) : 'Sin pagos'),
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <div className="flex justify-end">
                {canRegisterPayment ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Registrar pago"
                    aria-label="Registrar pago"
                    onClick={() => setSelectedId(row.quotation_id)}
                  >
                    <HandCoins className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Ver cotización"
                    aria-label="Ver cotización"
                    onClick={() => setSelectedId(row.quotation_id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.quotation_id}
        isLoading={isLoading}
        emptyIcon={Receipt}
        emptyTitle={hasActiveFilters ? 'Ninguna cotización coincide con los filtros' : 'No hay saldos pendientes de cobro'}
      />

      {data && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}

      {/* Registrar el pago desde el mismo detalle de siempre (pestaña Pagos). */}
      <QuotationDetailDialog quotationId={selectedId} initialTab="payments" onClose={() => setSelectedId(null)} />
    </div>
  );
}
