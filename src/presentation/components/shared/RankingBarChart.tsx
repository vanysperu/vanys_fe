import { Bar, BarChart, LabelList, XAxis, YAxis } from 'recharts';

import { ChartTooltipPanel, type ChartTooltipRow } from '@/presentation/components/shared/ChartTooltipPanel';
import { ChartContainer, ChartTooltip } from '@/presentation/components/shared/ui/chart';

export interface RankingItem {
  // Identificador único (dos clientes pueden llamarse igual).
  key: string;
  label: string;
  value: number;
  // Datos extra para el tooltip, ej. "Unidades: 120".
  details?: ChartTooltipRow[];
}

interface RankingBarChartProps {
  items: RankingItem[];
  // Qué mide la barra (ej. "Monto aceptado"): título del valor en el tooltip.
  valueLabel: string;
  formatValue: (value: number) => string;
  // Versión corta para la etiqueta al final de la barra (ej. S/ 6.7 K).
  formatLabel?: (value: number) => string;
  // Color de la serie (token de la paleta validada).
  color?: string;
}

const ROW_HEIGHT = 36;
// ~20 caracteres a 12 px entran en el ancho del eje (160 px) sin recortarse.
const MAX_LABEL_CHARS = 20;

const truncate = (text: string) => (text.length > MAX_LABEL_CHARS ? `${text.slice(0, MAX_LABEL_CHARS - 1)}…` : text);

interface CategoryTickProps {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string | number };
}

// Nombre de la categoría en UNA línea (recortado si no entra); el nombre
// completo queda en el tooltip, en la tabla y como <title> para lectores de
// pantalla. Recharts, por defecto, lo partía en dos líneas desalineadas.
function CategoryTick({ x, y, payload, labelByKey }: CategoryTickProps & { labelByKey: Map<string, string> }) {
  const label = labelByKey.get(String(payload?.value ?? '')) ?? '';
  return (
    <text x={Number(x)} y={Number(y)} dy={4} textAnchor="end" fontSize={12} className="fill-muted-foreground">
      <title>{label}</title>
      {truncate(label)}
    </text>
  );
}

// Ranking en barras horizontales (una sola serie, un solo color): ideal para
// "top N" con nombres largos. Barras finas (≤ 24 px) con el extremo
// redondeado, el valor al final de cada barra y el detalle en el tooltip.
export function RankingBarChart({
  items,
  valueLabel,
  formatValue,
  formatLabel = formatValue,
  color = 'var(--viz-series-1)',
}: RankingBarChartProps) {
  const labelByKey = new Map(items.map((item) => [item.key, item.label]));
  const height = Math.max(items.length * ROW_HEIGHT + 16, 120);

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="aspect-auto w-full"
      style={{ height }}
      initialDimension={{ width: 480, height }}
    >
      <BarChart data={items} layout="vertical" margin={{ top: 4, right: 64, bottom: 4, left: 8 }} barCategoryGap={6}>
        <XAxis type="number" hide domain={[0, 'dataMax']} />
        <YAxis
          type="category"
          dataKey="key"
          width={160}
          tickLine={false}
          axisLine={false}
          tick={(props: CategoryTickProps) => <CategoryTick {...props} labelByKey={labelByKey} />}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)' }}
          content={({ active, label }) => {
            const item = items.find((row) => row.key === label);
            if (!active || !item) return null;
            return (
              <ChartTooltipPanel
                title={item.label}
                rows={[{ label: valueLabel, value: formatValue(item.value), color }, ...(item.details ?? [])]}
              />
            );
          }}
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={24}>
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            fontSize={12}
            formatter={(value) => (typeof value === 'number' ? formatLabel(value) : value)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
