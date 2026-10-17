import { useState } from 'react';
import { ChevronRight, CircleDollarSign, Download, Eye, FileText, Receipt, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useDownloadQuotationPdf } from '@/modules/quotations/hooks/useQuotations';
import {
  QUOTATION_STATUS_COLOR,
  QUOTATION_STATUS_LABEL,
  QUOTATION_STATUS_ORDER,
  type Quotation,
} from '@/modules/quotations/types/quotation.types';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type QuotationQuickActionTab = 'payments' | 'expenses' | 'purchase-orders';

interface QuotationsByStatusProps {
  quotations: Quotation[];
  onSelect: (id: number) => void;
  // Abre el modal ya parado en esa pestaña (Pagos/Gastos/Compras) — evita
  // tener que entrar primero a Productos y navegar manualmente.
  onQuickAction: (id: number, tab: QuotationQuickActionTab) => void;
  // Abre la vista previa del PDF (no descarga directo) — desde ahí sí se
  // puede descargar.
  onPreviewPdf: (id: number) => void;
}

const GRID_COLS = '100px_minmax(150px,1.2fr)_110px_100px_100px_100px_150px';

// Lista agrupada por estado, mismo componente que usan el Panel principal y
// Cotizaciones en el spec de diseño Vanys (una sola fuente de verdad para
// el agrupamiento, ambas vistas muestran el mismo conjunto).
//
// Cada grupo es su propia tarjeta con espacio real entre una y otra, más un
// borde de color a la izquierda que corre por TODA la tarjeta (encabezado +
// filas) — antes todos los grupos vivían pegados en un solo bloque con
// apenas una línea fina entre ellos, y con la lista larga se confundía
// dónde terminaba un estado y empezaba el siguiente (pedido explícito del
// usuario tras probarlo).
export function QuotationsByStatus({ quotations, onSelect, onQuickAction, onPreviewPdf }: QuotationsByStatusProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const canRegisterPayment = usePermissionButton('cotizacion.payment.create.button');
  const canRegisterExpense = usePermissionButton('cotizacion.expense.create.button');
  const canCreatePurchaseOrder = usePermissionButton('purchase_order.create.button');
  const { mutate: downloadPdf } = useDownloadQuotationPdf();
  // Preview/descargar siempre se muestran — ver/bajar el PDF de una
  // cotización que ya puedes ver en esta lista no depende de un permiso de
  // botón aparte (el backend igual lo revalida en /quotation/:id/pdf).
  const showActionsColumn = true;

  const handleDirectDownload = (quotation: Quotation) => {
    downloadPdf(quotation.id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cotizacion-${String(quotation.id).padStart(4, '0')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  // Se muestran SIEMPRE los 10 estados (aunque un grupo esté vacío) — antes
  // se ocultaba el grupo sin cotizaciones, y eso hacía parecer que faltaban
  // estados del flujo completo (pedido explícito del usuario tras notar que
  // "no aparecen todos los estados").
  const groups = QUOTATION_STATUS_ORDER.map((status) => ({
    status,
    quotes: quotations.filter((q) => q.status === status),
  }));

  if (quotations.length === 0) {
    return <EmptyState icon={FileText} title="No se encontraron cotizaciones" />;
  }

  return (
    <div className="space-y-3">
      {groups.map(({ status, quotes }) => {
        const color = QUOTATION_STATUS_COLOR[status];
        const isOpen = !collapsed[status];
        const groupBalance = quotes.reduce((sum, q) => sum + (Number(q.total) - Number(q.total_paid)), 0);

        return (
          <div
            key={status}
            className="overflow-hidden rounded-xl border shadow-sm"
            style={{ borderLeftWidth: 4, borderLeftColor: color.fg }}
          >
            {/* El encabezado del grupo (estado + saldo) vive AFUERA del div
                que scrollea horizontalmente — antes estaba adentro con
                min-w-[900px] y se iba de la pantalla al hacer scroll a los
                lados, perdiendo de vista a qué estado pertenecía lo que se
                estaba viendo (pedido explícito del usuario). Solo la tabla
                de abajo (que sí necesita todas sus columnas) scrollea. */}
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [status]: isOpen }))}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:brightness-95"
              style={{ background: color.bg }}
            >
              <ChevronRight
                className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-90')}
                style={{ color: color.fg }}
              />
              <span className="text-[12.5px] font-bold" style={{ color: color.fg }}>
                {QUOTATION_STATUS_LABEL[status]}
              </span>
              <span
                className="font-mono-nums inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white/70 px-1 text-[10px] font-bold"
                style={{ color: color.fg }}
              >
                {quotes.length}
              </span>
              <span className="ml-auto text-[11px] font-medium whitespace-nowrap" style={{ color: color.fg }}>
                Saldo del grupo
              </span>
              <span className="font-mono-nums min-w-24 shrink-0 text-right text-[13px] font-bold" style={{ color: color.fg }}>
                {money(groupBalance)}
              </span>
            </button>

            <div className="scrollbar-thin overflow-x-auto">
              <div
                className="grid min-w-[900px] gap-2.5 border-b bg-muted/30 px-4 py-1.5 text-[9.5px] font-bold tracking-wide text-muted-foreground uppercase"
                style={{ gridTemplateColumns: GRID_COLS.split('_').join(' ') }}
              >
                <span>N° cotiz.</span>
                <span>Cliente</span>
                <span>Estado</span>
                <span className="text-right">Total</span>
                <span className="text-right">Pagado</span>
                <span className="text-right">Saldo</span>
                {showActionsColumn && <span className="text-right">Acciones</span>}
              </div>

              {isOpen && quotes.length === 0 && (
                <div className="bg-card px-4 py-3 text-[12px] text-muted-foreground">Sin cotizaciones en este estado.</div>
              )}

              {isOpen && quotes.length > 0 && (
                <div className="bg-card">
                  {quotes.map((quotation) => {
                    const balance = Number(quotation.total) - Number(quotation.total_paid);

                    return (
                      <div
                        key={quotation.id}
                        onClick={() => onSelect(quotation.id)}
                        className="grid min-w-[900px] cursor-pointer items-center gap-2.5 border-b px-4 py-2.5 transition-colors last:border-0 hover:bg-accent/60"
                        style={{ gridTemplateColumns: GRID_COLS.split('_').join(' ') }}
                      >
                        <span className="font-mono-nums text-[11.5px] font-semibold text-primary">
                          COT-{String(quotation.id).padStart(4, '0')}
                        </span>
                        <span className="truncate text-[12.5px] font-semibold">{quotation.client?.name ?? '—'}</span>
                        <span
                          className="inline-flex h-[19px] w-fit items-center rounded-md px-2 text-[10px] font-bold"
                          style={{ color: color.fg, background: color.bg }}
                        >
                          {QUOTATION_STATUS_LABEL[status]}
                        </span>
                        <span className="font-mono-nums text-right text-[12.5px] font-semibold">{money(quotation.total)}</span>
                        <span className="font-mono-nums text-right text-[12.5px] font-medium text-[var(--success)]">
                          {money(quotation.total_paid)}
                        </span>
                        <span
                          className={cn(
                            'font-mono-nums text-right text-[12.5px] font-semibold',
                            balance > 0 ? 'text-destructive' : 'text-muted-foreground',
                          )}
                        >
                          {money(balance)}
                        </span>
                        {showActionsColumn && (
                          <div className="flex items-center justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
                            {canRegisterPayment && (
                              <button
                                type="button"
                                title="Añadir pago"
                                onClick={() => onQuickAction(quotation.id, 'payments')}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-[var(--success)]/10 hover:text-[var(--success)]"
                              >
                                <CircleDollarSign className="size-4" />
                              </button>
                            )}
                            {canRegisterExpense && (
                              <button
                                type="button"
                                title="Añadir gasto"
                                onClick={() => onQuickAction(quotation.id, 'expenses')}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Receipt className="size-4" />
                              </button>
                            )}
                            {canCreatePurchaseOrder && (
                              <button
                                type="button"
                                title="Orden de compra"
                                onClick={() => onQuickAction(quotation.id, 'purchase-orders')}
                                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                              >
                                <ShoppingCart className="size-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Vista previa del PDF"
                              onClick={() => onPreviewPdf(quotation.id)}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button
                              type="button"
                              title="Descargar PDF"
                              onClick={() => handleDirectDownload(quotation)}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <Download className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
