import { formatPeriodEs } from '@/modules/cashClosings/utils/period';

// Si la respuesta de una corrección/anulación dice que se registró como ajuste
// de un mes cerrado (`kind: 'adjustment'`, `adjusted_period: 'YYYY-MM'`),
// devuelve el aviso extra para el toast; si no, cadena vacía.
export function adjustmentToastSuffix(result: unknown): string {
  if (typeof result !== 'object' || result === null) return '';
  const { kind, adjusted_period: adjustedPeriod } = result as { kind?: unknown; adjusted_period?: unknown };
  if (kind !== 'adjustment' || typeof adjustedPeriod !== 'string') return '';
  return `. Se registró como ajuste de ${formatPeriodEs(adjustedPeriod)} en el mes actual`;
}
