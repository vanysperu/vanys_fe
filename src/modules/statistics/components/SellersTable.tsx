import { Users } from 'lucide-react';

import type { SellerItem } from '@/modules/statistics/types/statistics.types';
import { formatInteger, formatMoney, formatPercent } from '@/modules/statistics/utils/format';
import { DataTable } from '@/presentation/components/shared/DataTable';

// Medidor de conversión: el relleno es el azul de la serie y la pista un paso
// más claro de la misma rampa (se lee el estado en toda la barra). El % va
// siempre en texto al lado: el color nunca es la única lectura.
function ConversionMeter({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center justify-end gap-2">
      <span
        className="h-1.5 w-20 overflow-hidden rounded-full bg-viz-meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(rate * 100)}
        aria-label="Tasa de conversión"
      >
        <span className="block h-full rounded-full bg-viz-series-1" style={{ width: `${Math.round(rate * 100)}%` }} />
      </span>
      <span className="w-12 text-right tabular-nums">{formatPercent(rate)}</span>
    </div>
  );
}

// Rendimiento por persona que cotiza: más de 7 datos por fila, así que va en
// tabla (no en gráfica). Ordenado por monto aceptado.
export function SellersTable({ sellers }: { sellers: SellerItem[] }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm" data-testid="table-sellers">
      <div className="space-y-0.5">
        <h2 className="text-sm font-semibold text-foreground">Rendimiento por vendedor</h2>
        <p className="text-xs text-muted-foreground">
          Cotizaciones emitidas en el periodo por cada persona, cuántas cerró y cuánto se cobró de ellas
        </p>
      </div>
      <DataTable<SellerItem>
        columns={[
          { header: 'Vendedor', cell: (row) => <span className="font-medium">{row.name}</span> },
          {
            header: 'Cotizó',
            align: 'right',
            cell: (row) => (
              <span className="tabular-nums">
                {formatInteger(row.quoted_count)} · {formatMoney(row.quoted_amount)}
              </span>
            ),
          },
          {
            header: 'Aceptadas',
            align: 'right',
            cell: (row) => <span className="tabular-nums">{formatInteger(row.won_count)}</span>,
          },
          { header: 'Conversión', align: 'right', cell: (row) => <ConversionMeter rate={row.conversion_rate} /> },
          {
            header: 'Monto aceptado',
            align: 'right',
            cell: (row) => <span className="tabular-nums">{formatMoney(row.won_amount)}</span>,
          },
          {
            header: 'Cobrado',
            align: 'right',
            cell: (row) => <span className="tabular-nums">{formatMoney(row.collected)}</span>,
          },
        ]}
        rows={sellers}
        rowKey={(row) => row.user_id ?? 'sin-asignar'}
        emptyIcon={Users}
        emptyTitle="Nadie emitió cotizaciones en este periodo"
      />
    </section>
  );
}
