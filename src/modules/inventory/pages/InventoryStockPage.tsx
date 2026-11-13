import { Boxes, Search } from 'lucide-react';
import { useState } from 'react';

import { useStock, useWarehouses } from '@/modules/inventory/hooks/useInventory';
import type { StockRow } from '@/modules/inventory/types/inventory.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { DataTable, type DataTableColumn } from '@/presentation/components/shared/DataTable';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Input } from '@/presentation/components/shared/ui/input';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const numberFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

// Stock actual (plan §8.3): por producto y color, una columna por almacén y el
// total consolidado. El costo promedio solo con el permiso "Ver costos".
export function InventoryStockPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const { data: warehouses } = useWarehouses({ page: 1, limit: 100, companyId }, { enabled: ready });
  const { data, isLoading } = useStock({ page, limit: pageSize, searchTerm: search.trim() || undefined, warehouseId: Number(warehouseId) || undefined, companyId });

  const columns = (warehouses?.data ?? []).filter((warehouse) => !warehouseId || String(warehouse.id) === warehouseId);
  const showCost = (data?.data ?? []).some((row) => row.avgCost !== null);
  const warehouseColumns: DataTableColumn<StockRow>[] = columns.map((warehouse) => ({
    header: warehouse.name,
    align: 'right',
    hideOnMobile: true,
    cell: (row) => {
      const entry = row.byWarehouse.find((item) => item.warehouseId === warehouse.id);
      return entry ? <span className="font-mono-nums">{numberFormatter.format(entry.quantity)}</span> : <span className="text-muted-foreground">—</span>;
    },
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Stock" description="Lo que hay en cada almacén, por producto y color" />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {ready && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar producto o SKU..." className="w-full pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>
            <FilterSelect
              value={warehouseId}
              onChange={(value) => { setWarehouseId(value); setPage(1); }}
              options={(warehouses?.data ?? []).map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))}
              allLabel="Todos los almacenes"
            />
          </div>
          <DataTable
            columns={[
              {
                header: 'Producto',
                cell: (row) => (
                  <div className="min-w-0">
                    <p className="font-medium">{row.productName}</p>
                    <p className="text-xs text-muted-foreground">{[row.sku, row.color].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                ),
              },
              ...warehouseColumns,
              { header: 'Total', align: 'right', cell: (row) => <span className="font-mono-nums font-semibold">{numberFormatter.format(row.total)}</span> },
              ...(showCost
                ? [{ header: 'Costo prom.', align: 'right' as const, cell: (row: StockRow) => (row.avgCost === null ? '—' : `S/ ${row.avgCost.toFixed(2)}`) }]
                : []),
            ]}
            rows={data?.data ?? []}
            rowKey={(row) => `${row.productId}|${row.color}`}
            isLoading={isLoading}
            emptyIcon={Boxes}
            emptyTitle="Todavía no hay stock"
          />
          {data && (
            <Pagination
              result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          )}
        </>
      )}
    </div>
  );
}
