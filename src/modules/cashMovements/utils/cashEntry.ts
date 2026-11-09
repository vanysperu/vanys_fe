import { formatPeriodEs } from '@/modules/cashClosings/utils/period';
import type {
  CashMovementListItem,
  CashMovementSource,
  CashTransferLegInfo,
} from '@/modules/cashMovements/types/cashMovement.types';

// Fila de una transferencia entre cuentas (trae sus dos puntas).
export type CashTransferRow = CashMovementListItem & { source: 'transfer'; transfer: CashTransferLegInfo };

export function isTransferRow(row: CashMovementListItem): row is CashTransferRow {
  return row.source === 'transfer' && row.transfer !== null;
}

// Fila de una de las fuentes con historial de correcciones (todas menos las
// transferencias, que dejan su rastro en el registro de auditoría).
export type CashMovementSourceRow = CashMovementListItem & { source: CashMovementSource };

export function isMovementSourceRow(row: CashMovementListItem): row is CashMovementSourceRow {
  return row.source !== 'transfer';
}

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
