import { Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { niceScale } from '@/lib/chartScale';
import type { TrendGranularity, TrendPoint } from '@/modules/statistics/types/statistics.types';
import { formatBucketLong, formatBucketShort, formatMoney, formatMoneyCompact } from '@/modules/statistics/utils/format';
import { VIZ_COLOR } from '@/modules/statistics/utils/palette';
import { ChartCard, ChartLegendKey } from '@/presentation/components/shared/ChartCard';
import { ChartTooltipPanel } from '@/presentation/components/shared/ChartTooltipPanel';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/presentation/components/shared/ui/chart';

const chartConfig = {
  income: { label: 'Ingresos', color: VIZ_COLOR.series1 },
  expenses: { label: 'Egresos', color: VIZ_COLOR.series2 },
} satisfies ChartConfig;

interface IncomeExpensesChartProps {
  trend: TrendPoint[];
  granularity: TrendGranularity;
}

// Caja del periodo, tramo por tramo: lo que entró (cobros + otros ingresos)
// contra lo que salió (gastos de cotizaciones + egresos). Columnas agrupadas
// en un solo eje (mismo S/), separadas por 2 px.
export function IncomeExpensesChart({ trend, granularity }: IncomeExpensesChartProps) {
  const isEmpty = trend.every((point) => point.income === 0 && point.expenses === 0);
  const scale = niceScale(Math.max(...trend.map((point) => Math.max(point.income, point.expenses))));

  return (
    <ChartCard
      title="Ingresos vs. egresos"
      description="Lo que entró (cobros a clientes y otros ingresos de caja) contra lo que salió (compras, gastos y egresos)"
      testId="chart-income-expenses"
      isEmpty={isEmpty}
      legend={
        <>
          <ChartLegendKey color={VIZ_COLOR.series1} label="Ingresos" />
          <ChartLegendKey color={VIZ_COLOR.series2} label="Egresos" />
        </>
      }
      table={
        <DataTable<TrendPoint>
          columns={[
            { header: granularity === 'day' ? 'Día' : 'Mes', cell: (row) => formatBucketLong(row.bucket, granularity) },
            { header: 'Ingresos', align: 'right', cell: (row) => formatMoney(row.income) },
            { header: 'Egresos', align: 'right', cell: (row) => formatMoney(row.expenses) },
            { header: 'Neto', align: 'right', cell: (row) => formatMoney(row.income - row.expenses) },
          ]}
          rows={trend}
          rowKey={(row) => row.bucket}
          emptyIcon={Wallet}
          emptyTitle="Sin movimientos"
        />
      }
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
        <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
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
            cursor={{ fill: 'var(--muted)' }}
            content={({ active, label }) => {
              const point = trend.find((row) => row.bucket === label);
              if (!active || !point) return null;
              return (
                <ChartTooltipPanel
                  title={formatBucketLong(point.bucket, granularity)}
                  rows={[
                    { label: 'Ingresos', value: formatMoney(point.income), color: VIZ_COLOR.series1 },
                    { label: 'Egresos', value: formatMoney(point.expenses), color: VIZ_COLOR.series2 },
                    { label: 'Neto', value: formatMoney(point.income - point.expenses) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
