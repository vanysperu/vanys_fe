import { History } from 'lucide-react';
import { useState } from 'react';

import { formatDateTime } from '@/lib/dateUtils';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { useKardex, useWarehouses } from '@/modules/inventory/hooks/useInventory';
import { DOC_TYPE_LABEL, REASON_LABEL } from '@/modules/inventory/types/inventory.types';
import type { Product } from '@/modules/products/types/product.types';
import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const numberFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

// Kardex (plan §8.3): movimientos de un producto (y color) por almacén y rango
// de fechas, con saldo inicial, saldo acumulado por fila y saldo final.
export function KardexPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const companyId = isSystem ? selectedCompanyId : undefined;
  const ready = !isSystem || Boolean(selectedCompanyId);
  const [product, setProduct] = useState<Product | null>(null);
  const [color, setColor] = useState<string | undefined>(undefined);
  const [warehouseId, setWarehouseId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const { data: warehouses } = useWarehouses({ page: 1, limit: 100, companyId }, { enabled: ready });
  const { data, isLoading } = useKardex(
    { productId: product?.id ?? 0, color: color ?? '', warehouseId: Number(warehouseId) || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, page, limit: 50, companyId },
    { enabled: Boolean(product) },
  );
  const showCost = (data?.data ?? []).some((row) => row.unitCost !== null);

  return (
    <div className="space-y-6">
      <PageHeader title="Kardex" description="Historial de entradas y salidas de un producto, con su saldo" />
      <CompanyStoreFields companyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />
      {ready && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Producto</Label>
            <ProductPicker className="w-72" onlyTracked companyId={companyId} value={product?.id}
              onChange={(next) => { setProduct(next); setColor(next.colors?.[0]?.name); setPage(1); }} />
          </div>
          {(product?.colors?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <Label>Color</Label>
              <FilterSelect hideAll value={color} onChange={(value) => { setColor(value); setPage(1); }}
                options={(product?.colors ?? []).map((entry) => ({ value: entry.name, label: entry.name }))} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Almacén</Label>
            <FilterSelect value={warehouseId} onChange={(value) => { setWarehouseId(value); setPage(1); }} allLabel="Todos"
              options={(warehouses?.data ?? []).map((warehouse) => ({ value: String(warehouse.id), label: warehouse.name }))} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kardex-from">Desde</Label>
            <Input id="kardex-from" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kardex-to">Hasta</Label>
            <Input id="kardex-to" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </div>
        </div>
      )}
      {product && data && (
        <div className="flex flex-wrap gap-6 text-sm" data-testid="kardex-balances">
          <span>Saldo inicial: <strong className="font-mono-nums">{numberFormatter.format(data.openingBalance)}</strong></span>
          <span>Saldo final: <strong className="font-mono-nums">{numberFormatter.format(data.closingBalance)}</strong></span>
        </div>
      )}
      {product ? (
        <>
          <DataTable
            columns={[
              { header: 'Fecha', cell: (row) => formatDateTime(row.at) },
              { header: 'Documento', cell: (row) => <span className="font-mono text-xs">{row.document.number}</span> },
              { header: 'Tipo', hideOnMobile: true, cell: (row) => `${row.document.doc_type ? DOC_TYPE_LABEL[row.document.doc_type] : ''} · ${REASON_LABEL[row.document.reason_code] ?? row.document.reason_code}` },
              { header: 'Almacén', hideOnMobile: true, cell: (row) => row.warehouseName },
              { header: 'Lote', hideOnMobile: true, cell: (row) => row.lotCode ?? '—' },
              { header: 'Entrada', align: 'right', cell: (row) => (row.quantityIn ? <span className="font-mono-nums text-[var(--success)]">{numberFormatter.format(row.quantityIn)}</span> : '') },
              { header: 'Salida', align: 'right', cell: (row) => (row.quantityOut ? <span className="font-mono-nums text-destructive">{numberFormatter.format(row.quantityOut)}</span> : '') },
              { header: 'Saldo', align: 'right', cell: (row) => <span className="font-mono-nums font-semibold">{numberFormatter.format(row.balance)}</span> },
              ...(showCost ? [{ header: 'Costo c/u', align: 'right' as const, cell: (row: { unitCost: number | null }) => (row.unitCost === null ? '—' : row.unitCost.toFixed(4)) }] : []),
              { header: 'Usuario', hideOnMobile: true, cell: (row) => row.userName ?? '—' },
            ]}
            rows={data?.data ?? []}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyIcon={History}
            emptyTitle="Sin movimientos en ese rango"
          />
          {data && <Pagination result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }} onPageChange={setPage} />}
        </>
      ) : (
        ready && <p className="text-sm text-muted-foreground">Elige un producto para ver su kardex.</p>
      )}
    </div>
  );
}
