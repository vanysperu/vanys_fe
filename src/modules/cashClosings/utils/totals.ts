import type { CashPeriodDetail, CashPeriodTotals } from '@/modules/cashClosings/types/cashClosings.types';

// Totales de la vista previa: los del detalle o, si no vinieran, la suma de
// las cuentas.
export function totalsOfDetail(detail: CashPeriodDetail): CashPeriodTotals {
  if (detail.totals) return detail.totals;
  return detail.balances.reduce<CashPeriodTotals>(
    (sum, balance) => ({
      opening: sum.opening + balance.opening,
      income: sum.income + balance.income,
      expense: sum.expense + balance.expense,
      adjustments: sum.adjustments + balance.adjustments,
      closing: sum.closing + balance.closing,
    }),
    { opening: 0, income: 0, expense: 0, adjustments: 0, closing: 0 },
  );
}
