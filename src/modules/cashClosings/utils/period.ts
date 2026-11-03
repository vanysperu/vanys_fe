import { toLocalIsoDate } from '@/lib/dateUtils';
import type { CashPeriodStatus } from '@/modules/cashClosings/types/cashClosings.types';

// Espejo de grulla_be: utils/dateUtils.ts (periodOf, formatPeriodEs...).
// Un periodo es 'YYYY-MM'.

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function periodOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftPeriod(period: string, months: number): string {
  const [year = 0, month = 1] = period.split('-').map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

// '2026-10' -> 'octubre 2026'
export function formatPeriodEs(period: string): string {
  const [year, month = '1'] = period.split('-');
  return `${MONTH_NAMES[Number(month) - 1] ?? period} ${year}`;
}

// '2026-10' -> 'Octubre 2026'
export function formatPeriodTitle(period: string): string {
  const label = formatPeriodEs(period);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// '2026-10-05' -> '05/10/2026'
export function formatDateEs(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

// ¿La fecha cae en un mes cerrado? (la empresa sin caja configurada nunca bloquea).
export function isDateInClosedPeriod(status: CashPeriodStatus | undefined, date: string | null | undefined): boolean {
  if (!status?.started || !date) return false;
  return status.closed_periods.includes(periodOf(date));
}

// Etiqueta del mes cerrado de una fecha ('octubre 2026'), o null si está abierto.
export function closedPeriodLabelOf(status: CashPeriodStatus | undefined, date: string | null | undefined): string | null {
  if (!date || !isDateInClosedPeriod(status, date)) return null;
  return formatPeriodEs(periodOf(date));
}

// Predicado para `DateField.disabled`: bloquea todo día de un mes cerrado,
// salvo la fecha original del movimiento (el backend permite dejarla igual).
export function lockedDatesExcept(status: CashPeriodStatus | undefined, originalDate?: string) {
  return (date: Date): boolean => {
    if (!status?.started) return false;
    const iso = toLocalIsoDate(date);
    if (iso === originalDate) return false;
    return status.closed_periods.includes(periodOf(iso));
  };
}
