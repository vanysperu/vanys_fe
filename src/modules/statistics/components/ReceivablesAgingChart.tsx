import { Receipt } from 'lucide-react';
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from 'recharts';

import type { AgingBucket, AgingItem } from '@/modules/statistics/types/statistics.types';
import { formatInteger, formatMoney, formatMoneyCompact } from '@/modules/statistics/utils/format';
import { AGING_COLORS, VIZ_COLOR } from '@/modules/statistics/utils/palette';
import { ChartCard } from '@/presentation/components/shared/ChartCard';
import { ChartTooltipPanel } from '@/presentation/components/shared/ChartTooltipPanel';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { ChartContainer, ChartTooltip, type ChartConfig } from '@/presentation/components/shared/ui/chart';

const AGING_LABEL: Record<AgingBucket, string> = {
  '0-30': '0 a 30 días',
  '31-60': '31 a 60 días',
  '61-90': '61 a 90 días',
  '91+': 'Más de 90 días',
};

const chartConfig = { amount: { label: 'Saldo por cobrar', color: VIZ_COLOR.series1 } } satisfies ChartConfig;

// Saldo por cobrar de HOY según su antigüedad (días desde que se emitió la
// cotización). Los tramos tienen orden, así que van en una sola tonalidad de
// claro a oscuro: lo más viejo (lo que más cuesta cobrar) es lo más intenso.
export function ReceivablesAgingChart({ aging }: { aging: AgingItem[] }) {
  const isEmpty = aging.every((item) => item.amount === 0);
  const data = aging.map((item) => ({ ...item, label: AGING_LABEL[item.bucket] }));

  return (
    <ChartCard
      title="Por cobrar según antigüedad"
      description="Saldo pendiente de hoy, por días desde la emisión (no depende del periodo)"
      testId="chart-receivables-aging"
      isEmpty={isEmpty}
      emptyText="No hay saldos pendientes de cobro"
      table={
        <DataTable<(typeof data)[number]>
          columns={[
            { header: 'Antigüedad', cell: (row) => row.label },
            { header: 'Cotizaciones', align: 'right', cell: (row) => formatInteger(row.count) },
            { header: 'Saldo', align: 'right', cell: (row) => formatMoney(row.amount) },
          ]}
          rows={data}
          rowKey={(row) => row.bucket}
          emptyIcon={Receipt}
          emptyTitle="Sin saldos"
        />
      }
    >
      <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={0} />
          <YAxis hide domain={[0, 'dataMax']} />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)' }}
            content={({ active, label }) => {
              const item = data.find((row) => row.label === label);
              if (!active || !item) return null;
              return (
                <ChartTooltipPanel
                  title={item.label}
                  rows={[
                    {
                      label: 'Saldo',
                      value: formatMoney(item.amount),
                      color: AGING_COLORS[data.indexOf(item)] ?? VIZ_COLOR.series1,
                    },
                    { label: 'Cotizaciones', value: formatInteger(item.count) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={24}>
            {data.map((item, index) => (
              <Cell key={item.bucket} fill={AGING_COLORS[index] ?? VIZ_COLOR.series1} />
            ))}
            <LabelList
              dataKey="amount"
              position="top"
              className="fill-foreground"
              fontSize={12}
              formatter={(value) => (typeof value === 'number' ? formatMoneyCompact(value) : value)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
