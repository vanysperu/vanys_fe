import { FileText } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { niceScale } from '@/lib/chartScale';
import type { TrendGranularity, TrendPoint } from '@/modules/statistics/types/statistics.types';
import {
  formatBucketLong,
  formatBucketShort,
  formatMoney,
  formatMoneyCompact,
  formatPercent,
} from '@/modules/statistics/utils/format';
import { VIZ_COLOR } from '@/modules/statistics/utils/palette';
import { ChartCard, ChartLegendKey } from '@/presentation/components/shared/ChartCard';
import { ChartTooltipPanel } from '@/presentation/components/shared/ChartTooltipPanel';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/presentation/components/shared/ui/chart';

const chartConfig = {
  quoted: { label: 'Cotizado', color: VIZ_COLOR.series1 },
  won: { label: 'Aceptado', color: VIZ_COLOR.series2 },
} satisfies ChartConfig;

// Línea recta entre tramos (no curva): los datos son totales por día o mes
// y una curva suavizada inventaría valores entre un tramo y el siguiente.
// Marca activa: punto de 8 px con anillo del color de la tarjeta (se lee
// aunque cruce la otra línea).
const ACTIVE_DOT = { r: 4, stroke: 'var(--card)', strokeWidth: 2 };

const acceptedShare = (point: TrendPoint) => (point.quoted > 0 ? formatPercent(point.won / point.quoted) : '—');

interface QuotedWonChartProps {
  trend: TrendPoint[];
  granularity: TrendGranularity;
}

// ¿Cuánto se cotiza y cuánto de eso se cierra? Por fecha de emisión de la
// cotización. Dos líneas de 2 px en un solo eje; la línea vertical que sigue
// al mouse muestra los dos valores del día/mes a la vez.
export function QuotedWonChart({ trend, granularity }: QuotedWonChartProps) {
  const isEmpty = trend.every((point) => point.quoted === 0);
  const scale = niceScale(Math.max(...trend.map((point) => Math.max(point.quoted, point.won))));

  return (
    <ChartCard
      title="Cotizado vs. aceptado"
      description="Monto de las cotizaciones emitidas y de las que el cliente aceptó"
      testId="chart-quoted-won"
      isEmpty={isEmpty}
      legend={
        <>
          <ChartLegendKey color={VIZ_COLOR.series1} label="Cotizado" mark="line" />
          <ChartLegendKey color={VIZ_COLOR.series2} label="Aceptado" mark="line" />
        </>
      }
      table={
        <DataTable<TrendPoint>
          columns={[
            { header: granularity === 'day' ? 'Día' : 'Mes', cell: (row) => formatBucketLong(row.bucket, granularity) },
            { header: 'Cotizado', align: 'right', cell: (row) => formatMoney(row.quoted) },
            { header: 'Aceptado', align: 'right', cell: (row) => formatMoney(row.won) },
            { header: '% aceptado', align: 'right', cell: acceptedShare },
          ]}
          rows={trend}
          rowKey={(row) => row.bucket}
          emptyIcon={FileText}
          emptyTitle="Sin cotizaciones"
        />
      }
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
        <LineChart data={trend} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="bucket"
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={16}
            tickFormatter={(bucket: string) => formatBucketShort(bucket, granularity)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            domain={[0, scale.max]}
            ticks={scale.ticks}
            tickFormatter={(value: number) => formatMoneyCompact(value)}
          />
          <ChartTooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            content={({ active, label }) => {
              const point = trend.find((row) => row.bucket === label);
              if (!active || !point) return null;
              return (
                <ChartTooltipPanel
                  title={formatBucketLong(point.bucket, granularity)}
                  rows={[
                    { label: 'Cotizado', value: formatMoney(point.quoted), color: VIZ_COLOR.series1 },
                    { label: 'Aceptado', value: formatMoney(point.won), color: VIZ_COLOR.series2 },
                    { label: '% aceptado', value: acceptedShare(point) },
                  ]}
                />
              );
            }}
          />
          <Line
            dataKey="quoted"
            type="linear"
            stroke="var(--color-quoted)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={ACTIVE_DOT}
          />
          <Line
            dataKey="won"
            type="linear"
            stroke="var(--color-won)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={ACTIVE_DOT}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}
