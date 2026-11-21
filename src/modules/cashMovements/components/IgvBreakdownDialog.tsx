import { Equal, Info, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { formatPeriodEs } from '@/modules/cashClosings/utils/period';
import { useIgvBreakdown } from '@/modules/cashMovements/hooks/useCashMovements';
import type { IgvBreakdown, MonthSummaryParams } from '@/modules/cashMovements/types/cashMovement.types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

const money = (amount: number) =>
  'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const quotationCode = (id: number) => `COT-${String(id).padStart(4, '0')}`;

interface IgvBreakdownDialogProps {
  params: MonthSummaryParams;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Acción extra en el encabezado (ej. exportar a Excel).
  actions?: ReactNode;
}

// Una caja de la cuenta "ventas − compras = a pagar".
function EquationTerm({ label, value, tone }: { label: string; value: number; tone: 'sales' | 'purchases' | 'result' }) {
  return (
    <div
      className={cn(
        'min-w-0 flex-1 rounded-lg border p-3 text-center',
        tone === 'sales' && 'border-primary/40 bg-primary/5',
        tone === 'purchases' && 'border-success/40 bg-success/5',
        tone === 'result' && 'border-foreground/20 bg-muted',
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="font-mono-nums text-lg font-semibold">{money(value)}</p>
    </div>
  );
}

// Barras proporcionales: cuánto IGV cobraste frente a cuánto pagaste. La parte
// que no cubren las compras es lo que queda por pagar (o el saldo a favor).
function IgvBars({ breakdown }: { breakdown: IgvBreakdown }) {
  const { total_igv: sales } = breakdown.sales;
  const { total_igv: purchases } = breakdown.purchases;
  const max = Math.max(sales, purchases, 0.01);
  const bar = (value: number) => `${Math.max((value / max) * 100, value > 0 ? 2 : 0)}%`;
  return (
    <div className="space-y-2" aria-hidden>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-32 shrink-0 text-muted-foreground">IGV de tus ventas</span>
        <div className="h-3 flex-1 rounded-full bg-muted">
          <div className="h-3 rounded-full bg-primary" style={{ width: bar(sales) }} />
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="w-32 shrink-0 text-muted-foreground">IGV de tus compras</span>
        <div className="h-3 flex-1 rounded-full bg-muted">
          <div className="h-3 rounded-full bg-success" style={{ width: bar(purchases) }} />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function TruncatedNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return <p className="text-xs text-warning">Se muestran las primeras 1000 líneas; el total sí es del mes completo.</p>;
}

function SalesTable({ breakdown }: { breakdown: IgvBreakdown }) {
  const { lines, total_amount, total_igv } = breakdown.sales;
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No hubo cobros con IGV en el mes.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" data-testid="igv-sales-table">
        <thead className="bg-muted/50 text-left text-xs">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Cotización</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2 text-right">Cobrado</th>
            <th className="px-3 py-2 text-right">Base</th>
            <th className="px-3 py-2 text-right">IGV</th>
            <th className="px-3 py-2">Factura</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.payment_id} className="border-t">
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(line.paid_at)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{quotationCode(line.quotation_id)}</td>
              <td className="px-3 py-2">{line.client_name}</td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap">{money(line.amount)}</td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap text-muted-foreground">{money(line.base)}</td>
              <td className="px-3 py-2 text-right font-mono-nums font-semibold whitespace-nowrap">{money(line.igv)}</td>
              <td className="px-3 py-2 text-xs">{line.invoice_issued ? 'Emitida' : 'No registrada'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/30 font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={3}>
              Total
            </td>
            <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap">{money(total_amount)}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap text-primary">{money(total_igv)}</td>
            <td className="px-3 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PurchasesTable({ breakdown }: { breakdown: IgvBreakdown }) {
  const { lines, total_amount, total_igv } = breakdown.purchases;
  if (lines.length === 0) return <p className="text-sm text-muted-foreground">No hubo compras con factura en el mes.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" data-testid="igv-purchases-table">
        <thead className="bg-muted/50 text-left text-xs">
          <tr>
            <th className="px-3 py-2">Factura</th>
            <th className="px-3 py-2">Emisión</th>
            <th className="px-3 py-2">Proveedor</th>
            <th className="px-3 py-2">Productos</th>
            <th className="px-3 py-2 text-right">Pagado</th>
            <th className="px-3 py-2 text-right">Base</th>
            <th className="px-3 py-2 text-right">IGV</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.invoice_id} className="border-t align-top">
              <td className="px-3 py-2 whitespace-nowrap">{line.series_number || `Sin número (#${line.invoice_id})`}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(line.issue_date ?? line.first_spent_at)}</td>
              <td className="px-3 py-2">{line.supplier_name ?? '—'}</td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {line.products.join(', ') || '—'}
                <span className="block">{line.quotation_ids.map(quotationCode).join(', ')}</span>
              </td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap">{money(line.amount)}</td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap text-muted-foreground">{money(line.base)}</td>
              <td className="px-3 py-2 text-right font-mono-nums font-semibold whitespace-nowrap">{money(line.igv)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t bg-muted/30 font-semibold">
          <tr>
            <td className="px-3 py-2" colSpan={4}>
              Total
            </td>
            <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap">{money(total_amount)}</td>
            <td className="px-3 py-2" />
            <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap text-success">{money(total_igv)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// "¿Cómo se llegó al IGV a pagar?" (pedido del usuario, 21-nov): la cuenta
// a la vista (ventas − compras = a pagar o saldo a favor) y, debajo, qué
// cobros y qué facturas de compra la forman, cada uno con su IGV.
export function IgvBreakdownDialog({ params, open, onOpenChange, actions }: IgvBreakdownDialogProps) {
  const { data: breakdown, isLoading } = useIgvBreakdown(params, open);
  const inFavor = (breakdown?.igv_balance ?? 0) < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>¿Cómo se calculó el IGV de {formatPeriodEs(params.period)}?</DialogTitle>
          <DialogDescription>
            El IGV que cobraste en tus ventas menos el IGV que pagaste en tus compras con factura.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !breakdown ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="min-w-0 space-y-5">
            {actions && <div className="flex justify-end">{actions}</div>}

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center" data-testid="igv-equation">
              <EquationTerm label="IGV de tus ventas (cobros)" value={breakdown.sales.total_igv} tone="sales" />
              <Minus className="mx-auto size-4 shrink-0 text-muted-foreground" aria-label="menos" />
              <EquationTerm label="IGV de tus compras con factura" value={breakdown.purchases.total_igv} tone="purchases" />
              <Equal className="mx-auto size-4 shrink-0 text-muted-foreground" aria-label="igual" />
              <EquationTerm
                label={inFavor ? 'Saldo a favor' : 'IGV a pagar (estimado)'}
                value={inFavor ? -breakdown.igv_balance : breakdown.igv_payable}
                tone="result"
              />
            </div>
            <IgvBars breakdown={breakdown} />

            <section className="space-y-2">
              <SectionTitle
                title="1. Cobros del mes: el IGV que cobraste"
                hint="Cada cobro lleva la misma proporción de IGV que su cotización (solo cotizaciones con IGV)."
              />
              <SalesTable breakdown={breakdown} />
              <TruncatedNotice show={breakdown.sales.truncated} />
            </section>

            <section className="space-y-2">
              <SectionTitle
                title="2. Compras con factura: el IGV que pagaste (crédito fiscal)"
                hint="Solo las compras que tienen su factura vinculada. El monto pagado ya incluye el IGV."
              />
              <PurchasesTable breakdown={breakdown} />
              <TruncatedNotice show={breakdown.purchases.truncated} />
            </section>

            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="mt-px size-3 shrink-0" />
              Es una estimación con lo cobrado y lo comprado con factura en el mes. Una cotización hecha sin IGV no suma aquí aunque
              después se haya facturado con IGV. El monto oficial lo calcula tu contador con los comprobantes.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
