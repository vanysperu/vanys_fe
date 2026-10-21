import { computeStatDelta } from '@/lib/statDelta';
import type { AgingItem, KpiValues } from '@/modules/statistics/types/statistics.types';
import { formatInteger, formatMoney, formatMoneyRounded, formatPercent } from '@/modules/statistics/utils/format';
import { StatTile } from '@/presentation/components/shared/StatTile';

interface KpiSectionProps {
  current: KpiValues;
  previous: KpiValues;
  aging: AgingItem[];
}

const plural = (count: number, singular: string, pluralForm: string) =>
  `${formatInteger(count)} ${count === 1 ? singular : pluralForm}`;

// Indicadores del periodo con su variación contra el periodo anterior de la
// misma duración (las fechas de ambos se muestran una sola vez, arriba). La cifra principal (una sola por tablero) es lo cobrado.
export function KpiSection({ current, previous, aging }: KpiSectionProps) {
  const receivableAmount = aging.reduce((sum, item) => sum + item.amount, 0);
  const receivableCount = aging.reduce((sum, item) => sum + item.count, 0);

  const relative = (key: keyof KpiValues, goodWhen: 'up' | 'down' = 'up') =>
    computeStatDelta({ current: current[key], previous: previous[key], kind: 'relative', goodWhen });
  const points = (key: 'conversion_rate' | 'margin_rate') =>
    computeStatDelta({ current: current[key], previous: previous[key], kind: 'points', goodWhen: 'up' });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        hero
        className="sm:col-span-2 lg:row-span-2 lg:justify-center"
        testId="kpi-collected"
        label="Cobrado"
        value={formatMoneyRounded(current.collected)}
        delta={relative('collected')}
        caption="Pagos de clientes recibidos en el periodo"
      />
      <StatTile
        testId="kpi-quoted"
        label="Cotizado"
        value={formatMoneyRounded(current.quoted_amount)}
        delta={relative('quoted_amount')}
        caption={plural(current.quoted_count, 'cotización emitida', 'cotizaciones emitidas')}
      />
      <StatTile
        testId="kpi-won"
        label="Aceptado"
        value={formatMoneyRounded(current.won_amount)}
        delta={relative('won_amount')}
        caption={plural(current.won_count, 'cotización aceptada', 'cotizaciones aceptadas')}
      />
      <StatTile
        testId="kpi-conversion"
        label="Tasa de conversión"
        value={current.conversion_rate === null ? '—' : formatPercent(current.conversion_rate)}
        delta={points('conversion_rate')}
        caption={`Aceptadas sobre decididas · ${plural(current.pending_count, 'esperando respuesta', 'esperando respuesta')}`}
      />
      <StatTile
        testId="kpi-ticket"
        label="Ticket promedio"
        value={current.average_ticket === null ? '—' : formatMoneyRounded(current.average_ticket)}
        delta={relative('average_ticket')}
        caption="Monto promedio de una cotización aceptada"
      />
      <StatTile
        testId="kpi-expenses"
        label="Gastos"
        value={formatMoneyRounded(current.expenses)}
        delta={relative('expenses', 'down')}
        caption="Compras, gastos de cotizaciones y egresos de caja"
      />
      <StatTile
        testId="kpi-net-cash"
        label="Flujo neto de caja"
        value={formatMoneyRounded(current.net_cash)}
        delta={relative('net_cash')}
        caption={`Entró ${formatMoney(current.collected + current.other_income)} · salió ${formatMoney(current.expenses)}`}
      />
      <StatTile
        testId="kpi-margin"
        label="Margen estimado"
        value={current.margin_rate === null ? '—' : formatPercent(current.margin_rate)}
        delta={points('margin_rate')}
        caption={`${formatMoney(current.margin_amount)} sin IGV, según los gastos ya registrados`}
      />
      <StatTile
        testId="kpi-receivable"
        label="Por cobrar hoy"
        value={formatMoneyRounded(receivableAmount)}
        caption={`${plural(receivableCount, 'cotización con saldo', 'cotizaciones con saldo')} · no depende del periodo`}
      />
    </div>
  );
}
