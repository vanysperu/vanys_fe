import { useState } from 'react';

import { formatDateTime } from '@/lib/dateUtils';
import { useStockSourceImports } from '@/modules/supplierStock/hooks/useSupplierStock';
import type { StockSource } from '@/modules/supplierStock/types/supplierStock.types';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

const TRIGGER_LABEL = { manual: 'A mano', upload: 'Archivo subido', schedule: 'Automática' } as const;

// Historial de lecturas de una fuente: cuándo, quién la disparó, cuántas filas
// y el error si falló.
export function StockImportsDialog({ source, onClose }: { source: StockSource | null; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useStockSourceImports(source?.id ?? null, page);

  return (
    <Dialog open={Boolean(source)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de lecturas</DialogTitle>
          <DialogDescription>{source?.name}</DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-32 w-full" />}
        <ul className="space-y-2">
          {(data?.data ?? []).map((entry) => (
            <li key={entry.id} className="rounded-lg border p-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={entry.status === 'ok' ? 'success' : entry.status === 'error' ? 'destructive' : 'muted'}>
                  {entry.status === 'ok' ? 'Bien' : entry.status === 'error' ? 'Falló' : 'En curso'}
                </Badge>
                <span className="text-xs text-muted-foreground">{TRIGGER_LABEL[entry.trigger_type]}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(entry.startedAt)}</span>
              </div>
              {entry.status === 'ok' && (
                <p className="mt-1 text-xs">
                  {entry.rows_valid} filas con código de {entry.rows_read} leídas
                </p>
              )}
              {entry.error && <p className="mt-1 text-xs text-destructive">{entry.error}</p>}
            </li>
          ))}
          {!isLoading && data?.data.length === 0 && <li className="text-sm text-muted-foreground">Todavía no se leyó.</li>}
        </ul>
        {data && data.meta.total > data.meta.limit && (
          <Pagination
            result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
            onPageChange={setPage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
