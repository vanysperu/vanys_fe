import { Lock, Scale } from 'lucide-react';

import { formatDateEs, formatPeriodEs } from '@/modules/cashClosings/utils/period';
import type { CashMovementListItem, CashMovementSource } from '@/modules/cashMovements/types/cashMovement.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { Badge } from '@/presentation/components/shared/ui/badge';

const SOURCE_NOUN: Record<CashMovementSource, string> = {
  manual: 'El movimiento',
  quotation_payment: 'El pago',
  quotation_expense: 'El gasto',
  employee_debt: 'La deuda',
  employee_debt_payment: 'La reposición',
};

const ACTION_TEXT = { correction: 'corregido', annul: 'anulado', restore: 'restaurado' } as const;

const code = (prefix: string, id: number | null) => (id ? ` · ${prefix}-${String(id).padStart(4, '0')}` : '');

// Candado de una fila cuyo mes ya está cerrado.
export function PeriodLockIcon({ row }: { row: CashMovementListItem }) {
  if (row.entry_kind !== 'movement' || row.period_status !== 'closed') return null;
  const month = formatPeriodEs(row.occurred_at.slice(0, 7));
  return (
    <span
      className="ml-1.5 inline-flex align-middle text-muted-foreground"
      title={`Mes cerrado (${month}). Si lo corriges, el cierre no cambia: la diferencia se registrará como ajuste hoy.`}
      data-testid="period-lock-icon"
    >
      <Lock className="size-3.5" aria-label={`Mes cerrado (${month})`} />
    </span>
  );
}

// Texto de las dos patas de un ajuste:
//  - 'Ajuste' = la diferencia que se anota HOY en el mes abierto;
//  - 'Valor al cierre' = lo que mantiene el mes cerrado tal como se cerró.
export function AdjustmentEntryDescription({ row }: { row: CashMovementListItem }) {
  const info = row.adjustment;
  if (row.entry_kind === 'movement') return null;

  const subject = `${SOURCE_NOUN[row.source]} #${row.source_id}${code('COT', row.quotation_id)}`;
  const changed =
    info && info.previous_amount !== null && info.new_amount !== null
      ? ` (${formatMoney(info.previous_amount)} → ${formatMoney(info.new_amount)})`
      : '';

  if (row.entry_kind === 'closing_hold') {
    const month = info ? formatPeriodEs(info.affected_period) : formatPeriodEs(row.occurred_at.slice(0, 7));
    const when = info ? ` el ${formatDateEs(info.posted_date)}` : '';
    const action = info ? ACTION_TEXT[info.action] : 'corregido';
    return (
      <div className="text-muted-foreground" data-testid="closing-hold-row">
        <Badge variant="muted">
          <Lock className="size-3" />
          Valor al cierre de {month.toLowerCase()}
        </Badge>
        <span className="mt-1 block text-xs">
          Mantiene el cierre de {month}: {subject.charAt(0).toLowerCase() + subject.slice(1)} se {action}
          {when}
          {changed}.
        </span>
      </div>
    );
  }

  const action = info ? ACTION_TEXT[info.action] : 'corregido';
  const affectedMonth = info ? ` de ${formatPeriodEs(info.affected_period).toLowerCase()}` : '';
  return (
    <div data-testid="adjustment-row">
      <Badge variant="warning">
        <Scale className="size-3" />
        Ajuste{affectedMonth}
      </Badge>
      <span className="mt-1 block text-xs">
        {subject} {action}
        {changed}.
      </span>
      {/* El motivo, como cita: es lo que explica la diferencia a quien revisa. */}
      {info?.reason && (
        <span className="mt-1 block rounded-md border-l-2 border-warning/60 bg-warning/5 px-2 py-1 text-xs text-muted-foreground italic [overflow-wrap:anywhere]">
          “{info.reason}”
        </span>
      )}
    </div>
  );
}
