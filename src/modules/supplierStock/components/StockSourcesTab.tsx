import { FileSpreadsheet, History, Pencil, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDateTime } from '@/lib/dateUtils';
import { StockImportsDialog } from '@/modules/supplierStock/components/StockImportsDialog';
import { StockSourceFormDialog } from '@/modules/supplierStock/components/StockSourceFormDialog';
import { useRefreshStockSource, useStockSources, useToggleStockSource } from '@/modules/supplierStock/hooks/useSupplierStock';
import type { StockSource } from '@/modules/supplierStock/types/supplierStock.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const STATUS_BADGE = {
  never: { label: 'Sin leer', variant: 'muted' },
  running: { label: 'Leyendo…', variant: 'default' },
  ok: { label: 'Al día', variant: 'success' },
  error: { label: 'Con error', variant: 'destructive' },
} as const;

// Pestaña "Fuentes": de dónde sale el stock de cada proveedor. Misma
// composición que los catálogos (CLAUDE.md §7): tabla, acciones a la derecha
// y paginación; "Nueva fuente" arriba.
export function StockSourcesTab({ companyId }: { companyId?: number }) {
  const [page, setPage] = useState(1);
  const [editSource, setEditSource] = useState<StockSource | null>(null);
  const [historySource, setHistorySource] = useState<StockSource | null>(null);
  const uploadTarget = useRef<StockSource | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canCreate = usePermissionButton('supplier_stock.sources.create.button');
  const canUpdate = usePermissionButton('supplier_stock.sources.update.button');
  const canDisable = usePermissionButton('supplier_stock.sources.disable.button');
  const canRefresh = usePermissionButton('supplier_stock.sources.refresh.button');
  const { data, isLoading } = useStockSources({ page, limit: 10, companyId });
  const { mutate: refresh, isPending: isRefreshing, variables: refreshing } = useRefreshStockSource();
  const { mutate: toggle, isPending: isToggling } = useToggleStockSource();

  const runRefresh = (source: StockSource, file: File | null) =>
    refresh(
      { id: source.id, file },
      {
        onSuccess: (updated) => toast.success(`${updated.name}: ${updated.itemCount} filas leídas`),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );

  const pickFile = (source: StockSource) => {
    uploadTarget.current = source;
    fileInput.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">El Excel de cada importadora, con qué columna es el código y cuál el stock.</p>
        {canCreate && <StockSourceFormDialog companyId={companyId} />}
      </div>

      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.xlsm,.csv"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || !uploadTarget.current) return;
          runRefresh(uploadTarget.current, file);
        }}
      />

      <DataTable
        columns={[
          {
            header: 'Fuente',
            cell: (source) => (
              <div className="min-w-0">
                <p className="font-medium">{source.name}</p>
                <p className="text-xs text-muted-foreground">{source.supplierName ?? '—'}</p>
              </div>
            ),
          },
          {
            header: 'Origen',
            hideOnMobile: true,
            cell: (source) =>
              source.source_type === 'url' ? (
                <span className="text-xs">Enlace · {source.urlHost ?? 'oculto'}</span>
              ) : (
                <span className="text-xs">Archivo que se sube</span>
              ),
          },
          {
            header: 'Última lectura',
            cell: (source) => {
              const badge = STATUS_BADGE[source.last_status];
              return (
                <div className="space-y-0.5">
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  {source.lastSuccessAt && <p className="text-xs text-muted-foreground">{formatDateTime(source.lastSuccessAt)}</p>}
                  {source.last_status === 'error' && source.last_error && (
                    <p className="max-w-64 text-xs text-destructive">{source.last_error}</p>
                  )}
                </div>
              );
            },
          },
          {
            header: 'Filas',
            align: 'right',
            cell: (source) => <span className="font-mono-nums">{source.itemCount}</span>,
          },
          {
            header: 'Estado',
            cell: (source) =>
              source.active ? <Badge variant="success">Activa</Badge> : <Badge variant="destructive">Inactiva</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (source) => (
              <div className="flex justify-end gap-1">
                {canRefresh && source.source_type === 'url' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Actualizar ahora"
                    aria-label={`Actualizar ${source.name}`}
                    disabled={!source.active || (isRefreshing && refreshing?.id === source.id)}
                    onClick={() => runRefresh(source, null)}
                  >
                    <RefreshCw className={isRefreshing && refreshing?.id === source.id ? 'size-4 animate-spin' : 'size-4'} />
                  </Button>
                )}
                {canRefresh && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    title="Subir el Excel"
                    aria-label={`Subir el Excel de ${source.name}`}
                    disabled={!source.active || isRefreshing}
                    onClick={() => pickFile(source)}
                  >
                    <Upload className="size-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title="Historial de lecturas"
                  aria-label={`Historial de ${source.name}`}
                  onClick={() => setHistorySource(source)}
                >
                  <History className="size-4" />
                </Button>
                {canUpdate && (
                  <Button variant="ghost" size="icon" className="size-8" aria-label={`Editar ${source.name}`} onClick={() => setEditSource(source)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={source.active}
                    disabled={isToggling}
                    entityLabel="fuente"
                    onToggle={() =>
                      toggle(source.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Fuente habilitada' : 'Fuente deshabilitada'),
                        onError: (error) => toast.error((error as ApiClientError).message),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(source) => source.id}
        isLoading={isLoading}
        emptyIcon={FileSpreadsheet}
        emptyTitle="Todavía no hay fuentes de stock"
      />

      {data && (
        <Pagination result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }} onPageChange={setPage} />
      )}

      {editSource && <StockSourceFormDialog source={editSource} onClose={() => setEditSource(null)} />}
      <StockImportsDialog source={historySource} onClose={() => setHistorySource(null)} />
    </div>
  );
}
