import { formatPeriodEs } from '@/modules/cashClosings/utils/period';
import type { CashMovementListItem } from '@/modules/cashMovements/types/cashMovement.types';

// Efecto de la fila en el saldo: ingreso suma, egreso resta. Las patas de un
// ajuste vienen con monto con signo, por eso se usa este valor y no el monto.
export function netAmountOf(row: CashMovementListItem): number {
  return row.direction === 'income' ? row.amount : -row.amount;
}

// Categoría de una pata de ajuste: 'Ajuste de marzo 2026' / 'Cierre de marzo 2026'.
export function adjustmentCategoryText(row: CashMovementListItem): string | null {
  if (row.entry_kind === 'movement') return null;
  const period = row.adjustment?.affected_period ?? row.occurred_at.slice(0, 7);
  return row.entry_kind === 'adjustment' ? `Ajuste de ${formatPeriodEs(period)}` : `Cierre de ${formatPeriodEs(period)}`;
}
