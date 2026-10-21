import { toLocalIsoDate } from '@/lib/dateUtils';

// Periodos rápidos para tableros (primero los atajos, al final el rango a
// medida — nadie quiere pelear con un calendario para "últimos 30 días").
export type PeriodPreset =
  | 'last7'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'last12Months'
  | 'custom';

export const PERIOD_PRESET_LABEL: Record<PeriodPreset, string> = {
  last7: 'Últimos 7 días',
  last30: 'Últimos 30 días',
  last90: 'Últimos 90 días',
  thisMonth: 'Este mes',
  lastMonth: 'Mes pasado',
  thisYear: 'Este año',
  last12Months: 'Últimos 12 meses',
  custom: 'Rango personalizado',
};

export interface PeriodRange {
  // YYYY-MM-DD, inclusivos.
  dateFrom: string;
  dateTo: string;
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Rango de un atajo, contado desde `today` (día local). "custom" no tiene
// rango propio: lo elige la persona.
export function resolvePresetRange(preset: Exclude<PeriodPreset, 'custom'>, today: Date = new Date()): PeriodRange {
  const end = toLocalIsoDate(today);
  const ranges: Record<Exclude<PeriodPreset, 'custom'>, () => PeriodRange> = {
    last7: () => ({ dateFrom: toLocalIsoDate(addDays(today, -6)), dateTo: end }),
    last30: () => ({ dateFrom: toLocalIsoDate(addDays(today, -29)), dateTo: end }),
    last90: () => ({ dateFrom: toLocalIsoDate(addDays(today, -89)), dateTo: end }),
    thisMonth: () => ({ dateFrom: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: end }),
    lastMonth: () => ({
      dateFrom: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      // Día 0 del mes actual = último día del mes pasado.
      dateTo: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 0)),
    }),
    thisYear: () => ({ dateFrom: toLocalIsoDate(new Date(today.getFullYear(), 0, 1)), dateTo: end }),
    last12Months: () => ({
      dateFrom: toLocalIsoDate(new Date(today.getFullYear(), today.getMonth() - 11, 1)),
      dateTo: end,
    }),
  };
  return ranges[preset]();
}
