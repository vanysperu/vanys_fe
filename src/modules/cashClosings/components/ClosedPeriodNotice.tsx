import { Lock } from 'lucide-react';

import { formatDateEs } from '@/modules/cashClosings/utils/period';

interface ClosedPeriodNoticeProps {
  // 'octubre 2026' (mes cerrado de la fecha original del movimiento).
  periodLabel: string;
  // Hoy (Lima) 'YYYY-MM-DD', del estado de cierres; fecha del ajuste.
  today?: string;
  // ¿El usuario puede ajustar meses cerrados (cash_closing.adjust.button)?
  // Default true: conserva el texto de siempre para quien no lo pase.
  canAdjust?: boolean;
}

// Aviso que se ve al corregir un movimiento de un mes cerrado: el cierre no
// cambia, la diferencia se anota hoy como ajuste y se pide motivo. Sin el
// permiso de ajustar, solo avisa que lo tiene que hacer un administrador.
export function ClosedPeriodNotice({ periodLabel, today, canAdjust = true }: ClosedPeriodNoticeProps) {
  const todayText = today ? ` (${formatDateEs(today)})` : '';

  return (
    <div
      role="note"
      data-testid="closed-period-notice"
      className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
    >
      <p className="flex items-center gap-1.5 font-medium">
        <Lock className="size-4 shrink-0" />
        Este movimiento es de un mes cerrado ({periodLabel})
      </p>
      {canAdjust ? (
        <>
          <p className="text-muted-foreground">
            Puedes corregirlo, pero el cierre de {periodLabel.split(' ')[0]} no cambiará: la diferencia se registrará como
            un ajuste con fecha de hoy{todayText}, con el motivo que escribas. Los saldos de la cotización o de la deuda sí
            se actualizan.
          </p>
          <p className="text-[11px] text-muted-foreground">La fecha solo puede quedarse igual o pasar a un mes abierto.</p>
        </>
      ) : (
        <p className="text-muted-foreground">
          Solo un administrador puede corregir o anular movimientos de un mes cerrado: se registran como un ajuste en el
          mes abierto. Pídele que lo haga.
        </p>
      )}
    </div>
  );
}
