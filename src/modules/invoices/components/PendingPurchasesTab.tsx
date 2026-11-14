import { FileText, Search } from 'lucide-react';
import { useState } from 'react';

import { formatDate } from '@/lib/dateUtils';
import { LinkInvoiceDialog } from '@/modules/invoices/components/LinkInvoiceDialog';
import { usePendingPurchases } from '@/modules/invoices/hooks/useInvoices';
import type { PendingPurchase } from '@/modules/invoices/types/invoice.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Input } from '@/presentation/components/shared/ui/input';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

interface PendingPurchasesTabProps {
  companyId?: number;
}

const purchaseLabel = (row: PendingPurchase) => `${row.quotation_code} · ${row.product_name} × ${row.quantity}`;

/**
 * Bandeja "Compras sin factura" (Sprint 2, ítem 3): las compras cuya factura
 * llega después. Se eligen varias y se registra UNA factura para todas, con su
 * archivo, sin motivo y sin pasar por "Corregir compra". El alcance (empresa y
 * tienda) lo decide el backend.
 */
export function PendingPurchasesTab({ companyId }: PendingPurchasesTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [includeNotRequired, setIncludeNotRequired] = useState(false);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  // Selección por id, con la fila para el resumen del diálogo (sobrevive al cambiar de página).
  const [selected, setSelected] = useState<Map<number, PendingPurchase>>(new Map());
  const [linking, setLinking] = useState(false);

  const { data: access } = useAccess();
  const canLink = usePermissionButton('invoice.link.button');
  // Mismo criterio que Cotizaciones: el filtro de tienda solo sirve a quien no está limitado a una.
  const canFilterByStore = !access?.isSystem && Boolean(access?.modules.includes('platform'));
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canFilterByStore });

  const { data, isLoading } = usePendingPurchases({
    page,
    limit: pageSize,
    companyId,
    includeNotRequired: includeNotRequired || undefined,
    storeId: storeFilter ? Number(storeFilter) : undefined,
    search: search.trim() || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const rows = data?.data ?? [];

  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const hasActiveFilters = Boolean(includeNotRequired || search || storeFilter || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setIncludeNotRequired(false);
    setSearch('');
    setStoreFilter(undefined);
    setDateRange({});
    setPage(1);
  };

  const toggle = (row: PendingPurchase, checked: boolean) =>
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(row.purchase_id, row);
      else next.delete(row.purchase_id);
      return next;
    });
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.purchase_id));
  const togglePage = () => rows.forEach((row) => toggle(row, !allOnPageSelected));
  const selectedRows = [...selected.values()];

  return (
    <div className="space-y-4" data-testid="pending-purchases">
      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar producto, cotización o cliente..."
            className="h-9 w-72 pl-9"
            value={search}
            onChange={(event) => withPageReset(setSearch)(event.target.value)}
          />
        </div>
        {canFilterByStore && (
          <FilterSelect
            aria-label="Tienda"
            allLabel="Todas las tiendas"
            value={storeFilter}
            onChange={withPageReset(setStoreFilter)}
            options={(businessUnits?.data ?? []).map((unit) => ({ value: String(unit.id), label: unit.business_code }))}
          />
        )}
        <DateRangeFilter placeholder="Fecha de la compra" value={dateRange} onChange={withPageReset(setDateRange)} />
        <label className="flex items-center gap-2 text-sm">
          <ToggleSwitch checked={includeNotRequired} onCheckedChange={withPageReset(setIncludeNotRequired)} label="Ver también las que no llevan factura" />
          Ver también las que no llevan factura
        </label>
      </FiltersBar>

      {canLink && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={togglePage} disabled={rows.length === 0}>
            {allOnPageSelected ? 'Quitar selección de la página' : 'Seleccionar la página'}
          </Button>
          <span className="text-sm text-muted-foreground">
            {selected.size === 0 ? 'Elige las compras que cubre la factura' : `${selected.size} seleccionadas · ${formatMoney(selectedRows.reduce((sum, row) => sum + row.amount, 0))}`}
          </span>
          <Button type="button" size="sm" className="ml-auto" disabled={selected.size === 0} onClick={() => setLinking(true)}>
            <FileText className="size-4" />
            Registrar factura
          </Button>
        </div>
      )}

      <DataTable<PendingPurchase>
        columns={[
          ...(canLink
            ? [
                {
                  header: '',
                  cell: (row: PendingPurchase) => (
                    <Checkbox
                      checked={selected.has(row.purchase_id)}
                      onCheckedChange={(checked) => toggle(row, checked === true)}
                      aria-label={`Elegir ${purchaseLabel(row)}`}
                    />
                  ),
                },
              ]
            : []),
          {
            header: 'Fecha',
            cell: (row) => (
              <span>
                {formatDate(row.spent_at)}
                <span className="block text-[10px] text-muted-foreground">{row.created_by_name ?? ''}</span>
              </span>
            ),
          },
          {
            header: 'Compra',
            cell: (row) => (
              <span>
                {row.product_name} × {row.quantity}
                <span className="block text-[10px] text-muted-foreground">
                  {row.quotation_code}
                  {row.client_name ? ` · ${row.client_name}` : ''}
                </span>
              </span>
            ),
          },
          { header: 'Tienda', cell: (row) => row.business_unit_name ?? '—', hideOnMobile: true },
          {
            header: 'Factura',
            cell: (row) =>
              row.invoice_status === 'pending' ? <Badge variant="warning">Llega después</Badge> : <Badge variant="muted">No lleva</Badge>,
          },
          { header: 'Monto', align: 'right', cell: (row) => <span className="tabular-nums">{formatMoney(row.amount)}</span> },
        ]}
        rows={rows}
        rowKey={(row) => row.purchase_id}
        isLoading={isLoading}
        emptyIcon={FileText}
        emptyTitle="No hay compras sin factura"
        emptyDescription='Las compras registradas con "Sí, llega después" aparecen acá.'
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

      <LinkInvoiceDialog
        open={linking}
        companyId={companyId}
        purchases={selectedRows.map((row) => ({ id: row.purchase_id, label: purchaseLabel(row), amount: row.amount }))}
        onClose={() => setLinking(false)}
        onLinked={() => setSelected(new Map())}
      />
    </div>
  );
}
