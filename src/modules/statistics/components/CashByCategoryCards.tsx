import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

import type { CashByCategory, CategoryAmount } from '@/modules/statistics/types/statistics.types';
import { formatMoney, formatMoneyCompact, formatPercent } from '@/modules/statistics/utils/format';
import { VIZ_COLOR } from '@/modules/statistics/utils/palette';
import { ChartCard } from '@/presentation/components/shared/ChartCard';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { RankingBarChart } from '@/presentation/components/shared/RankingBarChart';

interface CategoryCardProps {
  title: string;
  description: string;
  testId: string;
  items: CategoryAmount[];
  color: string;
  valueLabel: string;
  emptyText: string;
  icon: typeof ArrowUpCircle;
}

// Una categoría por barra, de mayor a menor, con su parte del total en el
// tooltip y en la tabla. Un solo color por tarjeta (el mismo de "Ingresos vs.
// egresos"): el título dice qué serie es, no hace falta leyenda.
function CategoryCard({ title, description, testId, items, color, valueLabel, emptyText, icon }: CategoryCardProps) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const shareOf = (amount: number) => (total > 0 ? formatPercent(amount / total) : '—');

  return (
    <ChartCard
      title={title}
      description={description}
      testId={testId}
      isEmpty={items.length === 0}
      emptyText={emptyText}
      table={
        <DataTable<CategoryAmount>
          columns={[
            { header: 'Categoría', cell: (row) => row.label },
            { header: 'Monto', align: 'right', cell: (row) => formatMoney(row.amount) },
            { header: '% del total', align: 'right', cell: (row) => shareOf(row.amount) },
          ]}
          rows={items}
          rowKey={(row) => row.key}
          emptyIcon={icon}
          emptyTitle={emptyText}
        />
      }
    >
      <RankingBarChart
        valueLabel={valueLabel}
        color={color}
        formatValue={formatMoney}
        formatLabel={formatMoneyCompact}
        items={items.map((item) => ({
          key: item.key,
          label: item.label,
          value: item.amount,
          details: [{ label: '% del total', value: shareOf(item.amount) }],
        }))}
      />
    </ChartCard>
  );
}

// Ingresos y egresos del periodo por categoría (pedido explícito del usuario).
// Suman lo mismo que "Ingresos" y "Egresos" del tablero y que Caja.
export function CashByCategoryCards({ data }: { data: CashByCategory }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CategoryCard
        title="Ingresos por categoría"
        description="De dónde vino lo que entró en el periodo"
        testId="chart-income-by-category"
        items={data.income}
        color={VIZ_COLOR.series1}
        valueLabel="Ingreso"
        emptyText="No hubo ingresos en este periodo"
        icon={ArrowDownCircle}
      />
      <CategoryCard
        title="Egresos por categoría"
        description="En qué se fue lo que salió en el periodo"
        testId="chart-expenses-by-category"
        items={data.expenses}
        color={VIZ_COLOR.series2}
        valueLabel="Egreso"
        emptyText="No hubo egresos en este periodo"
        icon={ArrowUpCircle}
      />
    </div>
  );
}
