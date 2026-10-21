import { CreditCard, Package, Palette, Trophy, Workflow } from 'lucide-react';

import { QUOTATION_STATUS_LABEL, QUOTATION_STATUS_ORDER } from '@/modules/quotations/types/quotation.types';
import type {
  PaymentsByAccountItem,
  StatusBreakdownItem,
  TopClientItem,
  TopProductItem,
  TopTechniqueItem,
} from '@/modules/statistics/types/statistics.types';
import { formatInteger, formatMoney, formatMoneyCompact } from '@/modules/statistics/utils/format';
import { ChartCard } from '@/presentation/components/shared/ChartCard';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { RankingBarChart } from '@/presentation/components/shared/RankingBarChart';

// ¿En qué quedaron las cotizaciones emitidas en el periodo? En el orden del
// flujo (pendiente → aceptada → … → finalizada, y al final las perdidas).
export function StatusBreakdownCard({ breakdown }: { breakdown: StatusBreakdownItem[] }) {
  const byStatus = new Map(breakdown.map((item) => [item.status, item]));
  const rows = QUOTATION_STATUS_ORDER.map((status) => byStatus.get(status)).filter(
    (item): item is StatusBreakdownItem => Boolean(item && item.count > 0),
  );

  return (
    <ChartCard
      title="¿En qué quedaron las cotizaciones?"
      description="Cotizaciones emitidas en el periodo, según su estado actual"
      testId="chart-status-breakdown"
      isEmpty={rows.length === 0}
      emptyText="No se emitieron cotizaciones en este periodo"
      table={
        <DataTable<StatusBreakdownItem>
          columns={[
            { header: 'Estado', cell: (row) => QUOTATION_STATUS_LABEL[row.status] },
            { header: 'Cotizaciones', align: 'right', cell: (row) => formatInteger(row.count) },
            { header: 'Monto', align: 'right', cell: (row) => formatMoney(row.amount) },
          ]}
          rows={rows}
          rowKey={(row) => row.status}
          emptyIcon={Workflow}
          emptyTitle="Sin cotizaciones"
        />
      }
    >
      <RankingBarChart
        valueLabel="Cotizaciones"
        formatValue={formatInteger}
        items={rows.map((row) => ({
          key: row.status,
          label: QUOTATION_STATUS_LABEL[row.status],
          value: row.count,
          details: [{ label: 'Monto', value: formatMoney(row.amount) }],
        }))}
      />
    </ChartCard>
  );
}

export function TopClientsCard({ clients }: { clients: TopClientItem[] }) {
  return (
    <ChartCard
      title="Clientes que más compran"
      description="Monto de sus cotizaciones aceptadas en el periodo"
      testId="chart-top-clients"
      isEmpty={clients.length === 0}
      emptyText="Todavía no hay cotizaciones aceptadas en este periodo"
      table={
        <DataTable<TopClientItem>
          columns={[
            { header: 'Cliente', cell: (row) => row.name },
            { header: 'Cotizaciones', align: 'right', cell: (row) => formatInteger(row.count) },
            { header: 'Monto aceptado', align: 'right', cell: (row) => formatMoney(row.amount) },
          ]}
          rows={clients}
          rowKey={(row) => row.client_id}
          emptyIcon={Trophy}
          emptyTitle="Sin clientes"
        />
      }
    >
      <RankingBarChart
        valueLabel="Monto aceptado"
        formatValue={formatMoney}
        formatLabel={formatMoneyCompact}
        items={clients.map((client) => ({
          key: String(client.client_id),
          label: client.name,
          value: client.amount,
          details: [{ label: 'Cotizaciones', value: formatInteger(client.count) }],
        }))}
      />
    </ChartCard>
  );
}

export function TopProductsCard({ products }: { products: TopProductItem[] }) {
  return (
    <ChartCard
      title="Productos más vendidos"
      description="Monto (sin IGV) en cotizaciones aceptadas del periodo"
      testId="chart-top-products"
      isEmpty={products.length === 0}
      emptyText="Todavía no hay cotizaciones aceptadas en este periodo"
      table={
        <DataTable<TopProductItem>
          columns={[
            { header: 'Producto', cell: (row) => row.name },
            { header: 'Unidades', align: 'right', cell: (row) => formatInteger(row.units) },
            { header: 'Monto', align: 'right', cell: (row) => formatMoney(row.amount) },
          ]}
          rows={products}
          rowKey={(row) => row.product_id}
          emptyIcon={Package}
          emptyTitle="Sin productos"
        />
      }
    >
      <RankingBarChart
        valueLabel="Monto vendido"
        formatValue={formatMoney}
        formatLabel={formatMoneyCompact}
        items={products.map((product) => ({
          key: String(product.product_id),
          label: product.name,
          value: product.amount,
          details: [{ label: 'Unidades', value: formatInteger(product.units) }],
        }))}
      />
    </ChartCard>
  );
}

export function TopTechniquesCard({ techniques }: { techniques: TopTechniqueItem[] }) {
  return (
    <ChartCard
      title="Técnicas más pedidas"
      description="Unidades personalizadas en cotizaciones aceptadas del periodo"
      testId="chart-top-techniques"
      isEmpty={techniques.length === 0}
      emptyText="No hubo productos personalizados en este periodo"
      table={
        <DataTable<TopTechniqueItem>
          columns={[
            { header: 'Técnica', cell: (row) => row.name },
            { header: 'Cotizaciones', align: 'right', cell: (row) => formatInteger(row.quotations) },
            { header: 'Unidades', align: 'right', cell: (row) => formatInteger(row.units) },
          ]}
          rows={techniques}
          rowKey={(row) => row.technique_id}
          emptyIcon={Palette}
          emptyTitle="Sin técnicas"
        />
      }
    >
      <RankingBarChart
        valueLabel="Unidades"
        formatValue={formatInteger}
        items={techniques.map((technique) => ({
          key: String(technique.technique_id),
          label: technique.name,
          value: technique.units,
          details: [{ label: 'Cotizaciones', value: formatInteger(technique.quotations) }],
        }))}
      />
    </ChartCard>
  );
}

export function PaymentsByAccountCard({ accounts }: { accounts: PaymentsByAccountItem[] }) {
  return (
    <ChartCard
      title="¿A dónde entró lo cobrado?"
      description="Pagos de clientes del periodo, por cuenta o efectivo"
      testId="chart-payments-by-account"
      isEmpty={accounts.length === 0}
      emptyText="No se registraron pagos en este periodo"
      table={
        <DataTable<PaymentsByAccountItem>
          columns={[
            { header: 'Cuenta', cell: (row) => row.label },
            { header: 'Pagos', align: 'right', cell: (row) => formatInteger(row.count) },
            { header: 'Monto', align: 'right', cell: (row) => formatMoney(row.amount) },
          ]}
          rows={accounts}
          rowKey={(row) => row.label}
          emptyIcon={CreditCard}
          emptyTitle="Sin pagos"
        />
      }
    >
      <RankingBarChart
        valueLabel="Cobrado"
        formatValue={formatMoney}
        formatLabel={formatMoneyCompact}
        items={accounts.map((account) => ({
          key: account.label,
          label: account.label,
          value: account.amount,
          details: [{ label: 'Pagos', value: formatInteger(account.count) }],
        }))}
      />
    </ChartCard>
  );
}
