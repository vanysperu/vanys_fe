import { PackageSearch, Search } from 'lucide-react';
import { useState } from 'react';

import { useStockSearch } from '@/modules/supplierStock/hooks/useSupplierStock';
import type { StockSearchRow } from '@/modules/supplierStock/types/supplierStock.types';
import { DataTable, type DataTableColumn } from '@/presentation/components/shared/DataTable';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Input } from '@/presentation/components/shared/ui/input';

const numberFormatter = new Intl.NumberFormat('es-PE');

// Pestaña "Stock" (plan §7): busca por código o descripción; una columna por
// fuente y el total; "solo sin producto" lista lo que falta enlazar.
export function StockSearchTab({ companyId }: { companyId?: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const { data, isLoading } = useStockSearch({
    page,
    limit: pageSize,
    searchTerm: search.trim() || undefined,
    onlyUnlinked: onlyUnlinked || undefined,
    companyId,
  });

  // Columnas de las fuentes que aparecen en esta página, en orden alfabético.
  const sources = [...new Map((data?.data ?? []).flatMap((row) => row.bySource.map((entry) => [entry.sourceId, entry.sourceName]))).entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  const sourceColumns: DataTableColumn<StockSearchRow>[] = sources.map((source) => ({
    header: source.name,
    align: 'right',
    cell: (row) => {
      const entry = row.bySource.find((item) => item.sourceId === source.id);
      if (!entry) return <span className="text-muted-foreground">—</span>;
      if (entry.quantity === null) return <span className="text-xs text-muted-foreground">{entry.quantityText ?? '—'}</span>;
      return <span className="font-mono-nums">{numberFormatter.format(entry.quantity)}</span>;
    },
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o descripción..."
            className="w-full pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <ToggleSwitch
            checked={onlyUnlinked}
            label="Solo códigos sin producto"
            onCheckedChange={(checked) => {
              setOnlyUnlinked(checked);
              setPage(1);
            }}
          />
          Solo códigos sin producto
        </label>
      </div>

      <DataTable
        columns={[
          {
            header: 'Código',
            cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
          },
          {
            header: 'Descripción',
            cell: (row) => row.description ?? '—',
            hideOnMobile: true,
          },
          {
            header: 'Producto',
            cell: (row) =>
              row.products.length > 0 ? (
                row.products.map((product) => product.name).join(', ')
              ) : (
                <span className="text-xs text-warning">Sin producto</span>
              ),
          },
          ...sourceColumns,
          {
            header: 'Total',
            align: 'right',
            cell: (row) => <span className="font-mono-nums font-semibold">{numberFormatter.format(row.total)}</span>,
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.code}
        isLoading={isLoading}
        emptyIcon={PackageSearch}
        emptyTitle={onlyUnlinked ? 'Todos los códigos tienen producto' : 'No se encontró stock'}
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
    </div>
  );
}
