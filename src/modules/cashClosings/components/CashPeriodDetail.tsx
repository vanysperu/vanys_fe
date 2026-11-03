import { ExternalLink, Lock, LockOpen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import type { ApiClientError } from '@/config/api.types';
import { CashBalanceEquation } from '@/modules/cashClosings/components/CashBalanceEquation';
import { CashPeriodAccountsTable } from '@/modules/cashClosings/components/CashPeriodAccountsTable';
import { CashPeriodStatusBadge } from '@/modules/cashClosings/components/CashPeriodStatusBadge';
import { ClosePeriodDialog } from '@/modules/cashClosings/components/ClosePeriodDialog';
import { PeriodAdjustmentsList } from '@/modules/cashClosings/components/PeriodAdjustmentsList';
import { PeriodEventsList } from '@/modules/cashClosings/components/PeriodEventsList';
import { ReopenPeriodDialog } from '@/modules/cashClosings/components/ReopenPeriodDialog';
import { useCashPeriodDetail } from '@/modules/cashClosings/hooks/useCashClosings';
import { formatDateEs, formatPeriodTitle } from '@/modules/cashClosings/utils/period';
import { totalsOfDetail } from '@/modules/cashClosings/utils/totals';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

interface CashPeriodDetailProps {
  period: string;
  companyId?: number;
}

// Detalle del mes seleccionado: la ecuación de saldos, las cuentas, los
// ajustes, el historial y las acciones (cerrar / reabrir / ver en Caja).
export function CashPeriodDetail({ period, companyId }: CashPeriodDetailProps) {
  const { data: detail, isLoading, isError, error } = useCashPeriodDetail(period, companyId);
  const canClose = usePermissionButton('cash_closing.close.button');
  const canReopen = usePermissionButton('cash_closing.reopen.button');
  const [closing, setClosing] = useState(false);
  const [reopening, setReopening] = useState(false);

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (isError || !detail) {
    return (
      <p className="text-sm text-destructive">{(error as ApiClientError | null)?.message ?? 'No se pudo cargar el mes'}</p>
    );
  }

  const title = formatPeriodTitle(detail.period);
  // companyId: el Super Administrador ve el mes de UNA empresa; Caja la toma
  // de ?companyId= como filtro inicial (para el resto el backend usa la suya).
  const companyQuery = companyId === undefined ? '' : `&companyId=${companyId}`;
  const caja = `/caja?dateFrom=${detail.period_start}&dateTo=${detail.period_end}${companyQuery}`;

  return (
    <div className="space-y-5" data-testid="cash-period-detail">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">
            Del {formatDateEs(detail.period_start)} al {formatDateEs(detail.period_end)}
            {detail.closed_by_name && detail.closed_at && (
              <> · Cerrado por {detail.closed_by_name} el {formatDateEs(detail.closed_at.date)} {detail.closed_at.time}</>
            )}
          </p>
          <CashPeriodStatusBadge item={detail} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={caja}>
              <ExternalLink className="size-4" />
              Ver movimientos en Caja
            </Link>
          </Button>
          {canReopen && detail.status === 'closed' && (
            <Button type="button" variant="outline" size="sm" onClick={() => setReopening(true)} data-testid="reopen-period-button">
              <LockOpen className="size-4" />
              Reabrir
            </Button>
          )}
          {canClose && detail.closable && (
            <Button type="button" size="sm" onClick={() => setClosing(true)} data-testid="close-period-button">
              <Lock className="size-4" />
              Cerrar {detail.label}
            </Button>
          )}
        </div>
      </div>

      {detail.status !== 'closed' && !detail.closable && detail.blocked_reason && (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground" data-testid="period-blocked-reason">
          {detail.blocked_reason}
        </p>
      )}
      {detail.status === 'reopened' && detail.reopen_reason && (
        <p className="min-w-0 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm [overflow-wrap:anywhere]">
          Reabierto por {detail.reopened_by_name ?? 'un administrador'}
          {detail.reopened_at && ` el ${formatDateEs(detail.reopened_at.date)}`}. Motivo: {detail.reopen_reason}
        </p>
      )}
      {detail.close_notes && (
        <p className="min-w-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          <span className="font-medium text-foreground">Nota del cierre:</span> {detail.close_notes}
        </p>
      )}

      <CashBalanceEquation totals={totalsOfDetail(detail)} isPreview={detail.is_preview} />
      <CashPeriodAccountsTable balances={detail.balances} totals={totalsOfDetail(detail)} />
      <PeriodAdjustmentsList period={detail.period} periodTitle={title} companyId={companyId} counts={detail.counts} />
      <PeriodEventsList period={detail.period} companyId={companyId} />

      {closing && <ClosePeriodDialog period={detail.period} companyId={companyId} onClose={() => setClosing(false)} />}
      {reopening && <ReopenPeriodDialog period={detail.period} companyId={companyId} onClose={() => setReopening(false)} />}
    </div>
  );
}
