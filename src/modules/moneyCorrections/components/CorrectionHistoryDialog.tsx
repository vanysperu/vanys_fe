import { useState } from 'react';
import { History, ShieldAlert } from 'lucide-react';

import type { ApiClientError } from '@/config/api.types';
import { parseLocalIsoDate } from '@/lib/dateUtils';
import { formatDateEs, formatPeriodEs } from '@/modules/cashClosings/utils/period';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { CorrectionChangesList } from '@/modules/moneyCorrections/components/CorrectionChangesList';
import { useCorrectionLookups } from '@/modules/moneyCorrections/hooks/useCorrectionLookups';
import { useMoneyCorrections } from '@/modules/moneyCorrections/hooks/useMoneyCorrections';
import { buildCorrectionChanges } from '@/modules/moneyCorrections/utils/correctionChanges';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

const PAGE_SIZE = 10;

interface CorrectionHistoryDialogProps {
  // Qué se está mirando (ej. "Pago de COT-0012"); va como subtítulo.
  title: string;
  // Endpoint de historial del módulo, ej. `/payment/12/corrections` o
  // `/cash-movement/5/corrections?source=quotation_payment`.
  historyUrl: string;
  // Key base de React Query, normalmente moneyCorrectionsKeys.history(source, id).
  queryKey: readonly unknown[];
  onClose: () => void;
}

// Historial inmutable de correcciones de una fila de dinero (cualquier
// fuente): qué tenía, qué quedó, quién lo corrigió, cuándo y por qué. Más
// reciente primero.
export function CorrectionHistoryDialog({ title, historyUrl, queryKey, onClose }: CorrectionHistoryDialogProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useMoneyCorrections({
    historyUrl,
    queryKey,
    params: { page, limit: PAGE_SIZE },
  });
  const lookups = useCorrectionLookups();

  const entries = data?.data ?? [];
  // Un 403 (rol sin el botón de historial) o cualquier otro error se
  // muestra acá en vez de dejar el diálogo vacío o "cargando".
  const errorMessage = isError ? ((error as ApiClientError | null)?.message ?? 'No se pudo cargar el historial') : null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial de correcciones</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">{title}</DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando historial...</p>}
        {errorMessage && <EmptyState icon={ShieldAlert} title="No se pudo ver el historial" description={errorMessage} />}
        {!isLoading && !errorMessage && entries.length === 0 && (
          <EmptyState icon={History} title="Este registro no tiene correcciones" />
        )}

        {!errorMessage && (
          <ol className="min-w-0 space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="min-w-0 rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.created_by_name ?? `Usuario #${entry.created_by}`}</span>
                  <span>
                    {parseLocalIsoDate(entry.created_date)?.toLocaleDateString('es-PE') ?? entry.created_date} ·{' '}
                    {entry.created_time}
                  </span>
                </div>
                {entry.kind === 'adjustment' && (
                  <div className="mb-2 space-y-1" data-testid="adjustment-history-entry">
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[var(--warning,#b45309)]">
                      Ajuste (mes cerrado)
                    </Badge>
                    {entry.adjustment && (
                      <p className="text-xs text-muted-foreground">
                        Diferencia registrada el {formatDateEs(entry.adjustment.posted_date)}
                        {entry.adjustment.account_name ? ` en ${entry.adjustment.account_name}` : ''}:{' '}
                        {entry.adjustment.net_effect < 0 ? '-' : '+'}
                        {formatMoney(Math.abs(entry.adjustment.net_effect))} (el cierre de {formatPeriodEs(entry.adjustment.affected_period)} no cambia)
                      </p>
                    )}
                  </div>
                )}
                <CorrectionChangesList changes={buildCorrectionChanges(entry.previous_values, entry.new_values, lookups)} />
                <p className="mt-2 text-sm [overflow-wrap:anywhere]">
                  <span className="font-medium">Motivo:</span> {entry.reason}
                </p>
              </li>
            ))}
          </ol>
        )}

        {data && data.meta.total > PAGE_SIZE && (
          <Pagination
            result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
            onPageChange={setPage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
