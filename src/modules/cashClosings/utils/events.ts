import type { CashPeriodEventItem, CashPeriodEventSnapshot, CashPeriodSnapshot } from '@/modules/cashClosings/types/cashClosings.types';
import { formatDateEs, formatPeriodEs } from '@/modules/cashClosings/utils/period';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';

// Los snapshots de cierre traen `totals`; los de saldo inicial, `openings`.
const isPeriodSnapshot = (snapshot: CashPeriodEventSnapshot | null): snapshot is CashPeriodSnapshot =>
  snapshot !== null && 'totals' in snapshot;

function closingOf(snapshot: CashPeriodEventSnapshot | null): number | null {
  return isPeriodSnapshot(snapshot) ? snapshot.totals.closing : null;
}

// Frase en lenguaje llano de cada evento del historial de cierres.
export function describeCashPeriodEvent(event: CashPeriodEventItem): string {
  const who = event.created_by_name ?? 'Un administrador';
  const when = `${formatDateEs(event.created_at.date)} ${event.created_at.time}`;
  const month = event.period ? formatPeriodEs(event.period) : '';

  switch (event.action) {
    case 'close':
      return `Cerrado por ${who} el ${when}`;
    case 'reclose': {
      const before = closingOf(event.previous_snapshot);
      const after = closingOf(event.snapshot);
      const change =
        before !== null && after !== null ? `: saldo final de ${formatMoney(before)} a ${formatMoney(after)}` : '';
      return `Vuelto a cerrar por ${who} el ${when}${change}`;
    }
    case 'reopen':
      return `Reabierto por ${who} el ${when}${event.reason ? ` — Motivo: ${event.reason}` : ''}`;
    case 'recalculate':
      return `Saldos recalculados por el nuevo cierre${month ? ` de ${month}` : ''} (${when})`;
    case 'opening_set':
      return `Saldo inicial registrado por ${who} el ${when}`;
  }
}
