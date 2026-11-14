import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, ChevronDown, ChevronUp, Eye, ImageIcon, RotateCcw, ShoppingCart } from 'lucide-react';
import { PurchaseItemProductDialog } from '@/modules/purchaseOrders/components/PurchaseItemProductDialog';
import { PurchaseLinesList } from '@/modules/purchaseOrders/components/PurchaseLinesList';
import { PurchaseWarehouseField } from '@/modules/purchaseOrders/components/PurchaseWarehouseField';
import { useWarehouseChoice, type WarehouseChoice } from '@/modules/purchaseOrders/hooks/useWarehouseChoice';
import { EMPTY_INVOICE_ANSWER, InvoiceQuestion, type InvoiceAnswer } from '@/modules/invoices/components/InvoiceQuestion';
import { useUploadInvoiceFile } from '@/modules/invoices/hooks/useInvoices';
import { QuotationItemVariant } from '@/modules/quotations/components/QuotationItemVariant';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useCreatePurchaseOrderItemPurchase, useUpdatePurchaseOrderItemStatus } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import {
  FUNDING_SOURCE_LABEL,
  PURCHASE_EXCEEDS_REMAINING_CODE,
  type CreatePurchaseOrderItemPurchaseDto,
  type FundingSource,
  type PurchaseExceedsRemainingDetail,
  type PurchaseOrderItem,
  type PurchaseOrderItemStatus,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { moneyAmountSchema } from '@/lib/moneySchema';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const registerPurchaseSchema = z.object({
  quantity: z.number({ error: 'La cantidad es obligatoria' }).int().positive('Debe ser mayor a 0'),
  amount: moneyAmountSchema(),
  notes: z.string().max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres`).optional(),
  funding_source: z.enum(['company', 'employee'], { error: 'Selecciona con qué plata se pagó' }),
  // Cuenta de la empresa desde la que se pagó (null = efectivo).
  payment_account_id: z.number().nullable().optional(),
  operation_number: z.string().max(50, 'Máximo 50 caracteres').optional(),
});
type RegisterPurchaseFormValues = z.infer<typeof registerPurchaseSchema>;

interface PendingExceed {
  itemId: number;
  dto: CreatePurchaseOrderItemPurchaseDto;
  // Foto o archivo de la factura elegido antes de confirmar.
  invoiceFile: File | null;
  detail: PurchaseExceedsRemainingDetail;
}

// "La cantidad a comprar era 10 (ya se compraron 8). Estás registrando 5,
// es decir 3 más de lo pedido. ¿Seguro quieres comprar más?"
function describeExceed({ ordered, already_purchased, requested }: PurchaseExceedsRemainingDetail): string {
  const remaining = Math.max(ordered - already_purchased, 0);
  const extra = requested - remaining;
  const progress = already_purchased > 0 ? ` (ya se compraron ${already_purchased})` : '';
  return `La cantidad a comprar era ${ordered}${progress}. Estás registrando ${requested}, es decir ${extra} más de lo pedido. ¿Seguro quieres comprar más?`;
}

interface PurchaseOrderItemsChecklistProps {
  items: PurchaseOrderItem[];
  canEdit: boolean;
  // Para invalidar el detalle de la cotización (pestaña Gastos) al
  // registrar una compra — toda compra genera un gasto real.
  quotationId?: number;
  // Empresa de la orden: el selector de cuenta solo ofrece las suyas
  // (importa para el Super Administrador, que ve varias empresas).
  companyId?: number;
}

const STATUS_STYLE: Record<PurchaseOrderItemStatus, string> = {
  pending: 'text-foreground',
  purchased: 'text-[var(--success)]',
  not_needed: 'text-muted-foreground/60 line-through italic',
};

// Checklist por producto de una orden de compra. Un producto puede
// conseguirse en varias compras distintas (500 lapiceros: 100 acá, 200
// allá, 200 más allá) — "Registrar compra" pide cantidad + monto cada vez
// (toda compra ES un gasto, se refleja solo en la pestaña Gastos) y el
// producto pasa a "comprado" recién cuando la suma alcanza lo pedido.
export function PurchaseOrderItemsChecklist({ items, canEdit, quotationId, companyId }: PurchaseOrderItemsChecklistProps) {
  const [openFormItemId, setOpenFormItemId] = useState<number | null>(null);
  // Compra que superaba lo pedido y espera confirmación (pedido explícito del
  // usuario: en vez de solo avisar, preguntar "¿seguro quieres comprar más?").
  const [pendingExceed, setPendingExceed] = useState<PendingExceed | null>(null);
  // Items con su lista de compras desplegada (corregir/anular cada una).
  const [expandedItemIds, setExpandedItemIds] = useState<number[]>([]);
  // Producto cuya foto y color se están viendo.
  const [viewItem, setViewItem] = useState<PurchaseOrderItem | null>(null);
  const toggleLines = (itemId: number) =>
    setExpandedItemIds((current) => (current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]));
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdatePurchaseOrderItemStatus();
  const { mutate: registerPurchase, isPending: isRegistering } = useCreatePurchaseOrderItemPurchase(quotationId);

  const setStatus = (itemId: number, status: PurchaseOrderItemStatus) => {
    updateStatus({ itemId, status }, { onError: (error) => toast.error((error as ApiClientError).message) });
  };

  const { mutateAsync: uploadInvoice } = useUploadInvoiceFile();

  // La compra se registra primero; si llevaba factura y se adjuntó la foto o
  // el archivo, se sube enseguida. Si la subida falla, la compra ya quedó y la
  // factura queda en "Faltan subir" (no se pierde nada).
  const submitPurchase = (itemId: number, dto: CreatePurchaseOrderItemPurchaseDto, invoiceFile: File | null) =>
    registerPurchase(
      { itemId, dto },
      {
        onSuccess: async (purchase) => {
          const label = `${dto.allow_exceed ? 'Compra adicional registrada' : 'Compra registrada'}${dto.warehouse_id ? ' e ingresada al almacén' : ''}`;
          setOpenFormItemId(null);
          setPendingExceed(null);
          // Sumada a una factura ya registrada: no hay nada que subir acá.
          if (dto.invoice_id) {
            toast.success(`${label} en la factura elegida`);
            return;
          }
          if (dto.invoice_pending) {
            toast.success(`${label}. Quedó en Facturas → "Compras sin factura".`);
            return;
          }
          if (!purchase.invoice_id || !invoiceFile) {
            toast.success(dto.has_invoice ? `${label}. Falta subir la factura (Facturas → "Faltan subir").` : label);
            return;
          }
          // mutateAsync y no mutate con callbacks: si con esta compra la orden
          // queda completa, sale de "Órdenes a mi cargo" y esta lista se
          // desmonta; los callbacks de mutate ya no correrían y nadie se
          // enteraría de si la factura subió o no.
          try {
            await uploadInvoice({ invoiceId: purchase.invoice_id, file: invoiceFile });
            toast.success(`${label} con su factura`);
          } catch (error) {
            toast.error(`${label}, pero la factura no se subió: ${(error as ApiClientError).message}. Quedó en "Faltan subir".`);
          }
        },
        onError: (error) => {
          const apiError = error as ApiClientError;
          // El backend no registra nada sin confirmación: se pregunta y,
          // si la persona acepta, se reenvía la misma compra confirmada.
          if (apiError.code === PURCHASE_EXCEEDS_REMAINING_CODE && !dto.allow_exceed) {
            setPendingExceed({ itemId, dto, invoiceFile, detail: apiError.errors as PurchaseExceedsRemainingDetail });
            return;
          }
          toast.error(apiError.message);
        },
      },
    );

  return (
    <>
    {/* Altura máxima con scroll: una orden con muchos productos (o con sus
        compras desplegadas) estiraba la fila de la tabla hacia abajo. Mientras
        se registra una compra no se limita, para que el formulario no quede
        cortado dentro del scroll. */}
    <div
      className={cn('space-y-2', openFormItemId === null && 'scrollbar-thin -mr-1 max-h-80 overflow-y-auto pr-1')}
      data-testid="purchase-order-items"
    >
      <ConfirmDialog
        open={pendingExceed !== null}
        onOpenChange={(open) => !open && setPendingExceed(null)}
        title="¿Comprar más de lo pedido?"
        description={pendingExceed ? describeExceed(pendingExceed.detail) : ''}
        confirmLabel="Sí, comprar más"
        cancelLabel="No"
        variant="default"
        onConfirm={() => {
          if (!pendingExceed) return;
          submitPurchase(pendingExceed.itemId, { ...pendingExceed.dto, allow_exceed: true }, pendingExceed.invoiceFile);
        }}
      />
      {items.map((item) => {
        // Una compra anulada no cuenta como comprada ni como gastada.
        const activePurchases = item.purchases.filter((purchase) => !purchase.is_deleted);
        const purchasedQty = activePurchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
        const spentAmount = activePurchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
        const hasEmployeeFunding = activePurchases.some((purchase) => purchase.funding_source === 'employee');
        const isFormOpen = openFormItemId === item.id;
        const linesOpen = expandedItemIds.includes(item.id);
        const productName = item.quotationItem?.product?.name ?? 'producto';

        return (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                {/* El nombre trunca solo a sí mismo (puede ser largo) — la
                    cantidad va aparte y con shrink-0, así nunca se la come
                    la elipsis del nombre (antes iban en el mismo <span> con
                    truncate y "(comprado/total)" quedaba escondido). */}
                <div className="flex items-baseline gap-1">
                  {item.quotationItem?.product ? (
                    <button
                      type="button"
                      title={item.quotationItem.product.images_enabled ? 'Ver foto y color' : 'Ver color y código'}
                      onClick={() => setViewItem(item)}
                      className={cn(
                        'inline-flex min-w-0 items-center gap-1 text-left underline-offset-2 hover:underline',
                        STATUS_STYLE[item.status],
                      )}
                      data-testid="purchase-item-view-product"
                    >
                      {/* El ícono avisa que se puede abrir: el nombre solo
                          parecía texto hasta pasar el mouse. */}
                      {item.quotationItem.product.images_enabled ? (
                        <ImageIcon className="size-3.5 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <Eye className="size-3.5 shrink-0 text-primary" aria-hidden />
                      )}
                      <span className="truncate">{item.quotationItem.product.name}</span>
                    </button>
                  ) : (
                    <span className={cn('truncate', STATUS_STYLE[item.status])}>
                      —
                    </span>
                  )}
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    ({purchasedQty}/{item.quantity})
                  </span>
                </div>
                {/* El color y el código se ven siempre: quien compra los
                    necesita, tenga la empresa fotos o no. */}
                {item.quotationItem && <QuotationItemVariant item={item.quotationItem} />}
                {purchasedQty > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Gastado: {money(spentAmount)}
                    {hasEmployeeFunding && <span className="ml-1 text-[var(--warning,#b45309)]">· incluye plata propia</span>}
                  </p>
                )}
                {item.purchases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleLines(item.id)}
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {linesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {linesOpen ? 'Ocultar compras' : `Ver compras (${item.purchases.length})`}
                  </button>
                )}
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {item.status === 'pending' && (
                    <button
                      type="button"
                      title="Registrar compra"
                      onClick={() => setOpenFormItemId(isFormOpen ? null : item.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[var(--success)]/10 hover:text-[var(--success)]"
                    >
                      <ShoppingCart className="size-3.5" />
                    </button>
                  )}
                  {item.status !== 'not_needed' && item.status !== 'purchased' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      title="Ya no es necesario"
                      onClick={() => setStatus(item.id, 'not_needed')}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Ban className="size-3.5" />
                    </button>
                  )}
                  {item.status === 'not_needed' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      title="Volver a pendiente"
                      onClick={() => setStatus(item.id, 'pending')}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {linesOpen && <PurchaseLinesList purchases={item.purchases} productName={productName} />}

            {isFormOpen && (
              <RegisterPurchaseForm
                itemId={item.id}
                remaining={item.quantity - purchasedQty}
                companyId={companyId}
                isPending={isRegistering}
                onCancel={() => setOpenFormItemId(null)}
                onSubmit={(values, invoiceFile) => submitPurchase(item.id, values, invoiceFile)}
              />
            )}
          </div>
        );
      })}
    </div>
    <PurchaseItemProductDialog item={viewItem} onClose={() => setViewItem(null)} />
    </>
  );
}

function RegisterPurchaseForm({
  itemId,
  remaining,
  companyId,
  isPending,
  onSubmit,
  onCancel,
}: {
  itemId: number;
  remaining: number;
  companyId?: number;
  isPending: boolean;
  onSubmit: (
    values: RegisterPurchaseFormValues & {
      has_invoice: boolean;
      invoice_id?: number;
      invoice_pending?: boolean;
      warehouse_id?: number | null;
      lot_code?: string | null;
      expiry_date?: string | null;
    },
    invoiceFile: File | null,
  ) => void;
  onCancel: () => void;
}) {
  // ¿La compra llevaba factura? Es obligatorio responder (pedido explícito del
  // usuario: tener mapeadas todas las facturas).
  const [invoice, setInvoice] = useState<InvoiceAnswer>(EMPTY_INVOICE_ANSWER);
  const [invoiceError, setInvoiceError] = useState<string | undefined>(undefined);
  // "Ingresar al almacén" (plan §8.4): undefined = el sugerido por el backend.
  const [warehouseChoice, setWarehouseChoice] = useState<WarehouseChoice | undefined>(undefined);
  const [warehouseError, setWarehouseError] = useState<string | undefined>(undefined);
  const { choice: warehouse, warehouse: chosenWarehouse } = useWarehouseChoice(itemId, warehouseChoice);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterPurchaseFormValues>({
    resolver: zodResolver(registerPurchaseSchema),
    defaultValues: { quantity: remaining > 0 ? remaining : 1, funding_source: 'company', payment_account_id: null },
  });
  const fundingSource = watch('funding_source');

  // Con plata del trabajador no se manda cuenta (el backend la rechaza): la
  // empresa no pagó nada todavía, su egreso será la reposición.
  const submit = (values: RegisterPurchaseFormValues) => {
    if (invoice.hasInvoice === null) {
      setInvoiceError('Indica si la compra tiene factura');
      return;
    }
    if (chosenWarehouse?.requires_expiry && !warehouse.expiryDate) {
      setWarehouseError('Este producto es perecible: indica el vencimiento del lote');
      return;
    }
    const usesExisting = invoice.hasInvoice && invoice.usesExisting;
    if (usesExisting && !invoice.existingInvoiceId) {
      setInvoiceError('Elige la factura en la que va esta compra');
      return;
    }
    onSubmit(
      {
        ...values,
        payment_account_id: values.funding_source === 'company' ? values.payment_account_id : null,
        // Con plata del trabajador el número va en su reposición.
        operation_number: values.funding_source === 'company' ? values.operation_number : undefined,
        has_invoice: invoice.hasInvoice,
        invoice_id: usesExisting ? (invoice.existingInvoiceId ?? undefined) : undefined,
        // "Sí, llega después": queda en Facturas → "Compras sin factura".
        invoice_pending: invoice.later || undefined,
        warehouse_id: warehouse.warehouseId,
        lot_code: chosenWarehouse?.track_lots ? warehouse.lotCode.trim() || null : null,
        expiry_date: chosenWarehouse?.requires_expiry ? warehouse.expiryDate || null : null,
      },
      invoice.hasInvoice && !usesExisting ? invoice.file : null,
    );
  };

  // Panel del formulario un tono más oscuro que la tarjeta que lo contiene,
  // para que los campos blancos se distingan (pedido explícito del usuario:
  // "blanco dentro de más blanco").
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-2 rounded-md border bg-muted/60 p-2">
      <p className="text-xs text-muted-foreground">
        Faltan {remaining} — si lo compraste en varios lugares, registra cada compra por separado.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="purchase-quantity" className="text-xs">
            Cantidad comprada
          </Label>
          <Input id="purchase-quantity" type="number" {...register('quantity', { valueAsNumber: true })} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="purchase-amount" className="text-xs">
            Monto pagado (S/)
          </Label>
          <Input id="purchase-amount" type="number" step={DECIMAL_INPUT_STEP} {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="purchase-notes" className="text-xs">
          Notas (opcional, ej. tienda donde se compró)
        </Label>
        <Textarea id="purchase-notes" rows={2} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
        <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">¿Con qué plata se pagó?</Label>
        <Select
          value={watch('funding_source')}
          onValueChange={(value) => setValue('funding_source', value as FundingSource, { shouldValidate: true })}
        >
          <SelectTrigger id="purchase-funding-source">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company">{FUNDING_SOURCE_LABEL.company}</SelectItem>
            <SelectItem value="employee">{FUNDING_SOURCE_LABEL.employee}</SelectItem>
          </SelectContent>
        </Select>
        {fundingSource === 'employee' && (
          <p className="text-xs text-muted-foreground">
            Se registrará como una deuda de la empresa hacia ti (ver "Deudas a personal"). No sale de Caja hasta que
            se te reponga.
          </p>
        )}
        {errors.funding_source && <p className="text-xs text-destructive">{errors.funding_source.message}</p>}
      </div>
      {fundingSource === 'company' && (
        <div className="space-y-1">
          <Label htmlFor="purchase-account" className="text-xs">
            ¿De dónde salió el dinero?
          </Label>
          <PaymentAccountSelect
            id="purchase-account"
            companyId={companyId}
            value={watch('payment_account_id')}
            onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
          />
        </div>
      )}
      {fundingSource === 'company' && (
        <OperationNumberField id="purchase-operation" className="h-8" error={errors.operation_number?.message} {...register('operation_number')} />
      )}
      <PurchaseWarehouseField
        itemId={itemId}
        value={warehouseChoice}
        onChange={(next) => {
          setWarehouseChoice(next);
          setWarehouseError(undefined);
        }}
        error={warehouseError}
      />
      <InvoiceQuestion
        question="¿La compra tiene factura?"
        value={invoice}
        onChange={(next) => {
          setInvoice(next);
          setInvoiceError(undefined);
        }}
        error={invoiceError}
        purchaseItemId={itemId}
        allowLater
      />
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          Guardar compra
        </Button>
      </div>
    </form>
  );
}
