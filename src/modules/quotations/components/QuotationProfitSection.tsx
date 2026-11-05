import { TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useQuotationProfit } from '@/modules/quotations/hooks/useQuotations';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

interface QuotationProfitSectionProps {
  quotationId: number;
  enabled: boolean;
}

const money = (amount: number) =>
  'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const percent = (rate: number | null) =>
  rate === null ? '—' : rate.toLocaleString('es-PE', { style: 'percent', maximumFractionDigits: 1 });

interface StepProps {
  label: string;
  hint?: string;
  amount: number;
  sign: '+' | '−';
  testId?: string;
}

// Una línea del cálculo: lo que suma o resta para llegar al neto.
function Step({ label, hint, amount, sign, testId }: StepProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-2" data-testid={testId}>
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p className="shrink-0 font-mono-nums text-sm">
        {sign} {money(amount)}
      </p>
    </div>
  );
}

// "¿Cuánto se le sacó a esta cotización?" (pedido explícito del usuario): de lo
// cobrado se descuenta el IGV (es de SUNAT), los gastos y las compras; el IGV
// de las compras con factura se recupera. Solo se ve en el sistema, nunca en
// el PDF que recibe el cliente.
export function QuotationProfitSection({ quotationId, enabled }: QuotationProfitSectionProps) {
  const { data: profit, isLoading, isError } = useQuotationProfit(quotationId, enabled);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !profit) return <EmptyState icon={TrendingUp} title="No se pudo calcular la ganancia" />;

  const isLoss = profit.net_profit < 0;

  return (
    <div className="space-y-4" data-testid="quotation-profit">
      <div className="rounded-lg border p-4">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Ganancia a hoy</p>
        <div className="divide-y">
          <Step label="Pagos recibidos" amount={profit.payments_received} sign="+" testId="profit-payments" />
          {profit.igv_in_payments > 0 && (
            <Step
              label="IGV de lo cobrado"
              hint="Es de SUNAT: no es ganancia"
              amount={profit.igv_in_payments}
              sign="−"
              testId="profit-igv"
            />
          )}
          <Step label="Gastos" hint="Gastos registrados en la cotización" amount={profit.expenses} sign="−" testId="profit-expenses" />
          <Step
            label="Compras"
            hint="Compras de las órdenes de compra, las haya pagado la empresa o un trabajador"
            amount={profit.purchases}
            sign="−"
            testId="profit-purchases"
          />
          {profit.igv_credit > 0 && (
            <Step
              label="IGV recuperable de compras con factura"
              hint={`Sobre ${money(profit.purchases_with_invoice)} comprados con factura`}
              amount={profit.igv_credit}
              sign="+"
              testId="profit-igv-credit"
            />
          )}
        </div>
        <div className="mt-2 flex items-end justify-between gap-4 border-t-2 pt-3">
          <div>
            <p className="text-sm font-semibold">{isLoss ? 'Pérdida neta' : 'Ganancia neta'}</p>
            <p className="text-xs text-muted-foreground">Margen sobre lo cobrado sin IGV: {percent(profit.net_margin_rate)}</p>
          </div>
          <p
            className={cn('font-mono-nums text-xl font-semibold', isLoss ? 'text-destructive' : 'text-success')}
            data-testid="profit-net"
          >
            {money(profit.net_profit)}
          </p>
        </div>
      </div>

      {profit.pending > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed p-4" data-testid="profit-projected">
          <div>
            <p className="text-sm font-semibold">Cuando se cobre todo</p>
            <p className="text-xs text-muted-foreground">
              Falta cobrar {money(profit.pending)} · margen {percent(profit.projected_margin_rate)}
            </p>
          </div>
          <p className="font-mono-nums text-base font-semibold">{money(profit.projected_profit)}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Total de la cotización {money(profit.total)}
        {profit.igv_total > 0 ? ` (sin IGV ${money(profit.subtotal)} + IGV ${money(profit.igv_total)})` : ' (sin IGV)'}. Los pagos y gastos
        anulados no cuentan.
      </p>
    </div>
  );
}
