import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AcceptQuotationDialog, type AcceptQuotationTarget } from '@/modules/quotations/components/AcceptQuotationDialog';
import { shouldAskForAdvance } from '@/modules/quotations/utils/advancePayment';
import { QuotationExpensesSection } from '@/modules/quotations/components/QuotationExpensesSection';
import { QuotationPurchaseOrdersSection } from '@/modules/purchaseOrders/components/QuotationPurchaseOrdersSection';
import { QuotationItemsKanban } from '@/modules/quotations/components/QuotationItemsKanban';
import { QuotationPaymentsSection } from '@/modules/quotations/components/QuotationPaymentsSection';
import { QuotationTimeline } from '@/modules/quotations/components/QuotationTimeline';
import { QuotationPdfPreviewDialog } from '@/modules/quotations/components/QuotationPdfPreviewDialog';
import { useChangeQuotationStatus, useDownloadQuotationPdf, useQuotation } from '@/modules/quotations/hooks/useQuotations';
import { ArrowRight, Download, Eye } from 'lucide-react';
import {
  QUOTATION_ITEM_PRICING_MODE_LABEL,
  QUOTATION_STATUS_LABEL,
  getForwardTransitions,
  type QuotationItem,
  type QuotationStatus,
} from '@/modules/quotations/types/quotation.types';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { useIsMobile } from '@/presentation/hooks/use-mobile';
import type { ApiClientError } from '@/config/api.types';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Ítems de la cotización como tarjetas (celular): nombre y técnica arriba,
// cantidad/modo/precio en una línea y los montos abajo, con el total a la
// vista sin tener que deslizar una tabla de lado.
function QuotationItemCards({
  items,
  includesIgv,
  itemIgv,
}: {
  items: QuotationItem[];
  includesIgv: boolean;
  itemIgv: (subtotal: number) => number;
}) {
  return (
    <ul className="space-y-2" data-testid="quotation-item-cards">
      {items.map((item) => {
        const subtotal = Number(item.subtotal);
        const igv = itemIgv(subtotal);
        return (
          <li key={item.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="font-medium">{item.product?.name}</p>
            <p className="text-xs text-muted-foreground">{item.technique?.name ?? 'Sin personalización'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cant. <span className="font-mono-nums text-foreground">{item.quantity}</span> ·{' '}
              {QUOTATION_ITEM_PRICING_MODE_LABEL[item.pricing_mode]} · S/ {Number(item.unit_price).toFixed(2)} c/u
            </p>
            <dl className="mt-2 space-y-0.5 rounded-md bg-muted/60 px-3 py-2 text-xs">
              {includesIgv && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Subtotal</dt>
                    <dd className="font-mono-nums">S/ {subtotal.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">IGV</dt>
                    <dd className="font-mono-nums">S/ {igv.toFixed(2)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between">
                <dt className="font-medium">{includesIgv ? 'Total' : 'Total (sin IGV)'}</dt>
                <dd className="font-mono-nums text-sm font-semibold text-primary">S/ {(subtotal + igv).toFixed(2)}</dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}

// Botones que llevan a un estado "de salida/excepción" (rojo) vs. flujo
// principal (primario) — mismo criterio visual que el diagrama de estados.
const EXIT_STATUSES: QuotationStatus[] = ['rejected', 'expired', 'cancelled'];

type QuotationDetailTab = 'products' | 'payments' | 'expenses' | 'purchase-orders' | 'timeline';

interface QuotationDetailDialogProps {
  quotationId: number | null;
  onClose: () => void;
  // Permite abrir el modal directo en una pestaña específica (ej. el botón
  // "Añadir pago" de la fila de la lista, sin pasar primero por Productos).
  initialTab?: QuotationDetailTab;
}

export function QuotationDetailDialog({ quotationId, onClose, initialTab = 'products' }: QuotationDetailDialogProps) {
  const open = quotationId !== null;
  const [tab, setTab] = useState<QuotationDetailTab>(initialTab);
  const { data: quotation, isLoading } = useQuotation(quotationId ?? 0, open);

  // Reinicia a la pestaña pedida cada vez que se abre una cotización
  // distinta (o la misma con otro botón de acceso rápido).
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [quotationId, initialTab, open]);
  const { mutate: changeStatus, isPending } = useChangeQuotationStatus(quotationId ?? 0);
  const canChangeStatus = usePermissionButton('cotizacion.changeStatus.button');
  const canMoveStage = usePermissionButton('cotizacion.item.changeStage.button');
  const canRegisterPayment = usePermissionButton('cotizacion.payment.create.button');
  const canRegisterExpense = usePermissionButton('cotizacion.expense.create.button');
  const canCreatePurchaseOrder = usePermissionButton('purchase_order.create.button');
  const { mutate: downloadPdf } = useDownloadQuotationPdf();
  const [previewOpen, setPreviewOpen] = useState(false);
  // Cotización que se está aceptando: abre el modal "¿pagó adelanto?".
  const [accepting, setAccepting] = useState<AcceptQuotationTarget | null>(null);

  const handleTransition = (status: QuotationStatus) => {
    if (!quotation) return;
    const askForAdvance = shouldAskForAdvance({
      currentStatus: quotation.status,
      nextStatus: status,
      balance: Number(quotation.total) - Number(quotation.total_paid),
      canRegisterPayment,
    });
    if (askForAdvance) {
      setAccepting({
        id: quotation.id,
        total: Number(quotation.total),
        total_paid: Number(quotation.total_paid),
        clientName: quotation.client?.name,
      });
      return;
    }
    changeStatus({ status }, {
      onSuccess: () => toast.success(`Cotización marcada como "${QUOTATION_STATUS_LABEL[status]}"`),
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  const handleDownloadPdf = () => {
    if (!quotationId) return;
    downloadPdf(quotationId, {
      onSuccess: (blob) => {
        // Se descarga directo, nunca se guarda en el servidor — cada
        // click genera el PDF al vuelo (pedido explícito del usuario).
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cotizacion-${String(quotationId).padStart(4, '0')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  const allowedNext = quotation ? getForwardTransitions(quotation.status) : [];
  const balance = quotation ? Number(quotation.total) - Number(quotation.total_paid) : 0;
  // IGV de cada ítem (pedido explícito del usuario: "no se ve claro cuánto
  // hay que pagar ni su IGV por fila"). La tasa sale de la propia cotización
  // (total vs. subtotal), igual que el resumen: así coincide con lo que se
  // cobró aunque el % configurado cambie después.
  const quotationSubtotal = Number(quotation?.subtotal ?? 0);
  const itemIgvRate =
    quotation?.includes_igv && quotationSubtotal > 0 ? (Number(quotation.total) - quotationSubtotal) / quotationSubtotal : 0;
  const itemIgv = (subtotal: number) => Math.round(subtotal * itemIgvRate * 100) / 100;
  // En el celular los ítems van como tarjetas: en la tabla los nombres se
  // partían en varias líneas y el total quedaba fuera de la vista.
  const isMobile = useIsMobile();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable defaultExpanded className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-12">
            <DialogTitle>Cotización #{quotationId}</DialogTitle>
            {quotation && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Vista previa del PDF"
                  onClick={() => setPreviewOpen(true)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Eye className="size-4" />
                </button>
                <button
                  type="button"
                  title="Descargar PDF"
                  onClick={handleDownloadPdf}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Download className="size-4" />
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        <QuotationPdfPreviewDialog quotationId={previewOpen ? quotationId : null} onClose={() => setPreviewOpen(false)} />
        <AcceptQuotationDialog quotation={accepting} onClose={() => setAccepting(null)} />

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {quotation && (
          // min-w-0: DialogContent es un grid — sin esto, este hijo (que
          // contiene el kanban ancho) se niega a encogerse por debajo de su
          // contenido y en vez de scrollear adentro empuja TODO el modal
          // (y hasta la página) a ser más ancho que la pantalla. El min-w-0
          // que ya tenía el propio DialogContent no alcanza: hay que
          // ponerlo también en cada hijo de la cadena hasta el que de
          // verdad scrollea (ver Tabs/TabsContent más abajo).
          <div className="min-w-0 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{quotation.client?.name}</p>
                {quotation.billing_name && (
                  <p className="text-xs text-muted-foreground">
                    Se factura a nombre de: <span className="font-medium">{quotation.billing_name}</span>
                    {quotation.billing_document_number ? ` (${quotation.billing_document_number})` : ''}
                  </p>
                )}
              </div>
              <Badge>{QUOTATION_STATUS_LABEL[quotation.status]}</Badge>
            </div>

            {quotation.production_days && (
              <p className="text-sm text-muted-foreground">
                Producción: <span className="font-medium text-foreground">{quotation.production_days}</span>{' '}
                {quotation.production_days === 1 ? 'día hábil' : 'días hábiles'}
              </p>
            )}

            {/* Desglose Subtotal/IGV/Total — antes solo se veía un "Total"
                opaco, sin decir si incluía IGV ni cuánto era (pedido
                explícito del usuario). El monto de IGV se deriva de
                total-subtotal (no del % actual configurado en "Variables
                Generales"): así queda fiel a lo que se cobró de verdad,
                aunque el porcentaje configurado cambie después. */}
            <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2.5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{money(quotation.subtotal)}</span>
              </div>
              {quotation.includes_igv && (
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>IGV</span>
                  <span>{money(Number(quotation.total) - Number(quotation.subtotal))}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-1">
                <span className="text-sm font-medium">Total</span>
                <span className="text-base font-semibold">{money(quotation.total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Pagado</p>
                <p className="text-base font-semibold text-[var(--success)]">{money(quotation.total_paid)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="text-base font-semibold">{money(balance)}</p>
              </div>
            </div>

            {canChangeStatus && allowedNext.length > 0 && (
              <div className="space-y-2 border-b pb-4">
                <div>
                  <p className="text-sm font-medium">Avanzar estado</p>
                  <p className="text-xs text-muted-foreground">
                    Para retroceder, arrastra la cotización en el tablero Kanban.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allowedNext.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={EXIT_STATUSES.includes(status) ? 'destructive' : 'default'}
                      disabled={isPending}
                      onClick={() => handleTransition(status)}
                    >
                      <ArrowRight className="size-4" />
                      {QUOTATION_STATUS_LABEL[status]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Tabs value={tab} onValueChange={(value) => setTab(value as QuotationDetailTab)}>
              <TabsList>
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="payments">Pagos</TabsTrigger>
                <TabsTrigger value="expenses">Gastos</TabsTrigger>
                <TabsTrigger value="purchase-orders">Compras</TabsTrigger>
                <TabsTrigger value="timeline">Historial</TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="space-y-4">
                {isMobile ? (
                  <QuotationItemCards
                    items={quotation.items}
                    includesIgv={Boolean(quotation.includes_igv)}
                    itemIgv={itemIgv}
                  />
                ) : (
                /* overflow-x-auto: si la ventana es angosta, la tabla se
                   desliza de lado sin ensanchar el modal. */
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-2">Producto</th>
                        <th className="px-3 py-2">Técnica</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                        <th className="px-3 py-2 text-right">Modo</th>
                        <th className="px-3 py-2 text-right whitespace-nowrap">P. unit.</th>
                        {quotation.includes_igv ? (
                          <>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                            <th className="px-3 py-2 text-right">IGV</th>
                            <th className="px-3 py-2 text-right">Total</th>
                          </>
                        ) : (
                          <th className="px-3 py-2 text-right whitespace-nowrap">Total (sin IGV)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-3 py-2">{item.product?.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{item.technique?.name ?? '—'}</td>
                          {/* Cantidad: solo el número (pedido explícito del
                              usuario: "en cantidad debe salir número no
                              texto de millar o unidad") — el modo de precio
                              ahora tiene su propia columna. */}
                          <td className="px-3 py-2 text-right font-mono-nums">{item.quantity}</td>
                          <td className="px-3 py-2 text-right text-xs whitespace-nowrap text-muted-foreground">
                            {QUOTATION_ITEM_PRICING_MODE_LABEL[item.pricing_mode]}
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">S/ {Number(item.unit_price).toFixed(2)}</td>
                          {quotation.includes_igv && (
                            <>
                              <td className="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
                                S/ {Number(item.subtotal).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right whitespace-nowrap text-muted-foreground">
                                S/ {itemIgv(Number(item.subtotal)).toFixed(2)}
                              </td>
                            </>
                          )}
                          {/* Lo que se cobra por el ítem, en el color de marca
                              de la empresa (--primary, ver useBrandTheme.ts)
                              para que destaque frente al resto de la fila. */}
                          <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-primary">
                            S/ {(Number(item.subtotal) + itemIgv(Number(item.subtotal))).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium">Avance por etapa de producción</p>
                  <QuotationItemsKanban
                    quotationId={quotation.id}
                    items={quotation.items}
                    companyId={quotation.company_id}
                    canMoveStage={canMoveStage}
                  />
                </div>

                {quotation.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{quotation.notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments">
                <QuotationPaymentsSection
                  quotationId={quotation.id}
                  payments={quotation.payments}
                  totalPaid={Number(quotation.total_paid)}
                  balance={balance}
                  canRegister={canRegisterPayment}
                />
              </TabsContent>

              <TabsContent value="expenses">
                <QuotationExpensesSection
                  quotationId={quotation.id}
                  expenses={quotation.expenses}
                  canRegister={canRegisterExpense}
                />
              </TabsContent>

              <TabsContent value="purchase-orders">
                <QuotationPurchaseOrdersSection
                  quotationId={quotation.id}
                  companyId={quotation.company_id}
                  items={quotation.items}
                  canCreate={canCreatePurchaseOrder}
                />
              </TabsContent>

              <TabsContent value="timeline">
                <QuotationTimeline events={quotation.events} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
