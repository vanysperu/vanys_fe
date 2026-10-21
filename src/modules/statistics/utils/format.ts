import type { TrendGranularity } from '@/modules/statistics/types/statistics.types';

const moneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Sin decimales: para cifras grandes de un vistazo (indicadores).
const roundMoneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  maximumFractionDigits: 0,
});

// Compacto para ejes y etiquetas de barras: S/ 0 · S/ 950 · S/ 6.7 K.
const compactMoneyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 });

export const formatMoney = (value: number) => moneyFormatter.format(value);
export const formatMoneyRounded = (value: number) => roundMoneyFormatter.format(value);
export const formatMoneyCompact = (value: number) => compactMoneyFormatter.format(value);
export const formatInteger = (value: number) => integerFormatter.format(value);
export const formatPercent = (value: number) => percentFormatter.format(value);

// Fechas YYYY-MM-DD como día calendario (UTC fijo: nunca se corre de día).
const dayFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayWithYearFormatter = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const longMonthFormatter = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const toUtcDate = (dateOnly: string) => {
  const [year = 1970, month = 1, day = 1] = dateOnly.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

// "21/10/2026"
export const formatDate = (dateOnly: string) => dayWithYearFormatter.format(toUtcDate(dateOnly));

// Etiqueta corta del eje X: "21 oct." (día) u "oct. 26" (mes).
export const formatBucketShort = (bucket: string, granularity: TrendGranularity) =>
  granularity === 'day' ? dayFormatter.format(toUtcDate(bucket)) : monthFormatter.format(toUtcDate(`${bucket}-01`));

// Etiqueta larga (tooltip/tabla): "21/10/2026" u "octubre de 2026".
export const formatBucketLong = (bucket: string, granularity: TrendGranularity) =>
  granularity === 'day' ? formatDate(bucket) : longMonthFormatter.format(toUtcDate(`${bucket}-01`));
