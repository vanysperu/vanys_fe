// Formato de soles para textos que salen fuera de la app (mensaje de WhatsApp,
// vista pública de la cotización): "S/ 1,234.50". Mismo formato que
// Estadísticas (modules/statistics/utils/format.ts).
const solesFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatSoles = (value: number | string): string => solesFormatter.format(Number(value));
