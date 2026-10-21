import type { ChartConfig } from '@/presentation/components/shared/ui/chart';

// Roles de color de las gráficas. Los valores (claro/oscuro) viven como
// tokens en index.css (--viz-*), validados con el método de visualización:
// acá solo se asigna cada rol, nunca un hex suelto.
export const VIZ_COLOR = {
  series1: 'var(--viz-series-1)',
  series2: 'var(--viz-series-2)',
} as const;

// Antigüedad del saldo por cobrar: rampa ordinal (0-30 → +90 días).
export const AGING_COLORS = [
  'var(--viz-aging-1)',
  'var(--viz-aging-2)',
  'var(--viz-aging-3)',
  'var(--viz-aging-4)',
] as const;

// Una sola serie (rankings, estados): el color 1 en todas las barras. El
// título dice qué se mide, así que no lleva leyenda.
export const singleSeriesConfig = (key: string, label: string): ChartConfig => ({
  [key]: { label, color: VIZ_COLOR.series1 },
});
