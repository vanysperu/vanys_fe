import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiClientError } from '@/config/api.types';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { moneyAmountSchema } from '@/lib/moneySchema';
import { EMPTY_INVOICE_ANSWER, InvoiceQuestion, type InvoiceAnswer } from '@/modules/invoices/components/InvoiceQuestion';
import { useUploadInvoiceFile } from '@/modules/invoices/hooks/useInvoices';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { ClosedPeriodNotice } from '@/modules/cashClosings/components/ClosedPeriodNotice';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import { useCorrectionLookups } from '@/modules/moneyCorrections/hooks/useCorrectionLookups';
import type { MoneyCorrectionValues } from '@/modules/moneyCorrections/types/moneyCorrection.types';
import {
  buildCorrectionChanges,
  describeCorrectionChanges,
  formatMoney,
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { useCorrectPurchase, usePurchase } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import {
  FUNDING_SOURCE_LABEL,
  type CorrectPurchaseDto,
  type FundingSource,
  type PurchaseDetail,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { correctionReasonSchema } from '@/modules/quotations/schemas/quotation.schema';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

const correctPurchaseSchema = z.object({
  quantity: z.number({ error: 'La cantidad es obligatoria' }).int('Debe ser un número entero').positive('Debe ser mayor a 0'),
  amount: moneyAmountSchema(),
  spent_at: z.string({ error: 'La fecha es obligatoria' }).min(1, 'La fecha es obligatoria'),
  funding_source: z.enum(['company', 'employee'], { error: 'Selecciona con qué plata se pagó' }),
  paid_by_user_id: z.number().nullable(),
  payment_account_id: z.number().nullable(),
  operation_number: z.string().max(50, 'Máximo 50 caracteres').nullable(),
  // Confirmación explícita de comprar por encima de lo pedido.
  allow_exceed: z.boolean(),
  reason: correctionReasonSchema,
});
type CorrectPurchaseFormValues = z.infer<typeof correctPurchaseSchema>;

interface CorrectPurchaseDialogProps {
  purchaseId: number;
  onClose: () => void;
}

// Campos corregibles de una compra, en el orden del historial.
const PURCHASE_FIELDS = ['amount', 'quantity', 'spent_at', 'funding_source', 'paid_by_user_id', 'payment_account_id', 'operation_number'] as const;

type PurchaseFields = {
  amount: number;
  quantity: number;
  spent_at: string;
  funding_source: FundingSource;
  paid_by_user_id: number | null;
  payment_account_id: number | null;
  operation_number: string | null;
};

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Lo que cambia en la factura según lo respondido (vacío = no se toca).
const invoiceChangeOf = (hadInvoice: boolean, answer: InvoiceAnswer): Pick<CorrectPurchaseDto, 'has_invoice' | 'invoice_id'> => {
  if (!answer.hasInvoice) return hadInvoice ? { has_invoice: false } : {};
  if (answer.usesExisting) return answer.existingInvoiceId ? { has_invoice: true, invoice_id: answer.existingInvoiceId } : {};
  return hadInvoice ? {} : { has_invoice: true };
};

// Texto del "Antes → Después" para la factura.
const invoiceAfterText = (hadInvoice: boolean, answer: InvoiceAnswer): string => {
  if (!answer.hasInvoice) return 'Sin factura';
  return hadInvoice && answer.usesExisting ? 'En otra factura' : 'Con factura';
};

// Corregir una compra de orden de compra (desde el checklist de la orden, la
// pestaña Gastos de la cotización o Caja). Carga la compra vigente por id: el
// backend corrige compra + gasto + deuda con el trabajador juntos y deja el
// antes/después en el historial (el mismo que el de su gasto).
export function CorrectPurchaseDialog({ purchaseId, onClose }: CorrectPurchaseDialogProps) {
  const { data: purchase, isLoading, isError, error } = usePurchase(purchaseId);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Corregir compra</DialogTitle>
          <DialogDescription className="[overflow-wrap:anywhere]">
            {purchase?.product_name ? `${purchase.product_name} · ` : ''}La corrección queda en el historial de la compra,
            con el antes, el después y el motivo.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando compra...</p>}
        {isError && (
          <EmptyState
            icon={Info}
            title="No se pudo cargar la compra"
            description={(error as ApiClientError | null)?.message ?? 'Inténtalo de nuevo'}
          />
        )}
        {purchase?.is_deleted && (
          <EmptyState icon={Info} title="No se puede corregir" description="Esta compra está anulada." />
        )}
        {purchase && !purchase.is_deleted && <PurchaseCorrectionForm purchase={purchase} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function PurchaseCorrectionForm({ purchase, onClose }: { purchase: PurchaseDetail; onClose: () => void }) {
  const { data: access } = useAccess();
  const accountsCompanyId = access?.isSystem ? purchase.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(accountsCompanyId);
  // Si el movimiento es de un mes cerrado, la corrección se registra como ajuste.
  const closedGuard = useClosedPeriodGuard(accountsCompanyId, purchase.spent_at);
  const { data: usersResult } = useUsers({ limit: 100, isActive: true });
  const lookups = useCorrectionLookups();
  const { mutateAsync: savePurchase, isPending } = useCorrectPurchase();
  const { mutateAsync: uploadInvoice } = useUploadInvoiceFile();
  // ¿Llevaba factura? También se corrige acá (pedido explícito del usuario).
  const hadInvoice = purchase.invoice_id !== null;
  const [invoice, setInvoice] = useState<InvoiceAnswer>({ ...EMPTY_INVOICE_ANSWER, hasInvoice: hadInvoice });
  const [invoiceError, setInvoiceError] = useState<string | undefined>(undefined);

  const original: PurchaseFields = {
    amount: Number(purchase.amount),
    quantity: purchase.quantity,
    spent_at: purchase.spent_at,
    funding_source: purchase.funding_source,
    paid_by_user_id: purchase.paid_by_user_id,
    payment_account_id: purchase.payment_account_id,
    operation_number: normalizeText(purchase.operation_number),
  };

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CorrectPurchaseFormValues>({
    resolver: zodResolver(correctPurchaseSchema),
    defaultValues: { ...original, allow_exceed: false, reason: '' },
  });

  // Ya repuesto al trabajador: no se le puede quitar la deuda (cambiar quién
  // pagó) ni bajar el monto por debajo de eso — el backend lo bloquea igual.
  const reimbursed = Number(purchase.debt_paid_amount ?? 0);
  const workerLocked = reimbursed > 0;
  // Solo trabajadores activos de la empresa de la orden (el backend lo revalida).
  const workers = (usersResult?.data ?? []).filter((user) => user.status && user.company_id === purchase.company_id);
  const workerName = (userId: number | null): string | null => {
    if (userId === null) return null;
    if (userId === purchase.paid_by_user_id) return purchase.paid_by_user_name;
    const worker = workers.find((user) => user.id === userId);
    return worker ? `${worker.name} ${worker.paternal_lastname}` : null;
  };
  const accounts = accountsResult?.data ?? [];
  const accountName = (accountId: number | null): string | null => {
    if (accountId === null) return null;
    if (accountId === purchase.payment_account_id) return purchase.payment_account_name;
    return accounts.find((account) => account.id === accountId)?.name ?? null;
  };

  const watched = watch();
  const fundingSource = watched.funding_source;
  // Con plata del trabajador no hay cuenta; con la de la empresa, no hay trabajador.
  const current: PurchaseFields = {
    amount: Number(watched.amount),
    quantity: Number(watched.quantity),
    spent_at: watched.spent_at ?? '',
    funding_source: fundingSource,
    paid_by_user_id: fundingSource === 'employee' ? (watched.paid_by_user_id ?? null) : null,
    payment_account_id: fundingSource === 'company' ? (watched.payment_account_id ?? null) : null,
    // Con plata de un trabajador no aplica: su número va en la reposición.
    operation_number: fundingSource === 'company' ? normalizeText(watched.operation_number) : null,
  };
  const remaining = Math.max(purchase.item_quantity - purchase.other_purchased_quantity, 0);
  const exceeds = current.quantity > remaining && current.quantity > original.quantity;

  const toValues = (values: PurchaseFields): MoneyCorrectionValues => ({
    ...values,
    paid_by_user_name: workerName(values.paid_by_user_id),
    payment_account_name: accountName(values.payment_account_id),
  });
  const { previous, next, changedFields } = pickChangedValues(toValues(original), toValues(current), PURCHASE_FIELDS);
  const invoiceChange = invoiceChangeOf(hadInvoice, invoice);
  const invoiceChanged = invoiceChange.has_invoice !== undefined;
  // La factura va en el mismo "Antes → Después", aunque no sea dinero.
  const changes = buildCorrectionChanges(
    invoiceChanged ? { ...previous, invoice_status: hadInvoice ? 'Con factura' : 'Sin factura' } : previous,
    invoiceChanged ? { ...next, invoice_status: invoiceAfterText(hadInvoice, invoice) } : next,
    lookups,
  );
  // Sacarla de una factura que solo cubre esta compra borra esa factura.
  const leavesInvoice = hadInvoice && invoiceChanged && purchase.invoice_purchases_count <= 1;

  const { request, confirmProps } = useCorrectionConfirm<CorrectPurchaseDto>({
    submit: async (dto) => {
      const result = await savePurchase({ id: purchase.id, dto });
      if (!result.invoice_created || result.invoice_id === null || !invoice.file) return result;
      // La corrección ya quedó: si el archivo falla, la factura queda en "Faltan subir".
      try {
        await uploadInvoice({ invoiceId: result.invoice_id, file: invoice.file });
      } catch (error) {
        toast.error(`La factura no se subió: ${(error as ApiClientError).message}. Quedó en "Faltan subir".`);
      }
      return result;
    },
    successMessage: 'Compra corregida correctamente',
    fallbackErrorMessage: 'No se pudo corregir la compra',
    onSuccess: onClose,
  });

  const onSubmit = (values: CorrectPurchaseFormValues) => {
    if (values.funding_source === 'employee' && values.paid_by_user_id === null) {
      setError('paid_by_user_id', { message: 'Selecciona qué trabajador puso el dinero' });
      return;
    }
    if (exceeds && !values.allow_exceed) {
      setError('allow_exceed', { message: 'Confirma que se compró más de lo pedido' });
      return;
    }
    if (invoice.hasInvoice && invoice.usesExisting && !invoice.existingInvoiceId) {
      setInvoiceError('Elige la factura en la que va esta compra');
      return;
    }
    // Solo lo que cambió (lo ausente se queda como está).
    const dto = changedFields.reduce<CorrectPurchaseDto>(
      (picked, field) => ({ ...picked, [field]: current[field as keyof PurchaseFields] }),
      { reason: values.reason, ...(exceeds ? { allow_exceed: true } : {}), ...invoiceChange },
    );
    request(dto);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="purchase-correct-quantity">Cantidad comprada</Label>
            <Input id="purchase-correct-quantity" type="number" {...register('quantity', { valueAsNumber: true })} />
            <p className="text-[11px] text-muted-foreground">
              Pedido: {purchase.item_quantity} · otras compras: {purchase.other_purchased_quantity}
            </p>
            {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase-correct-amount">Monto pagado (S/)</Label>
            <Input
              id="purchase-correct-amount"
              type="number"
              step={DECIMAL_INPUT_STEP}
              {...register('amount', { valueAsNumber: true })}
            />
            {workerLocked && (
              <p className="text-[11px] text-muted-foreground">Mínimo {formatMoney(reimbursed)} (ya repuesto al trabajador).</p>
            )}
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
        </div>

        {exceeds && (
          <div className="space-y-1 rounded-md border border-[var(--warning,#b45309)]/40 p-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="purchase-correct-allow-exceed"
                checked={watched.allow_exceed}
                onCheckedChange={(checked) => setValue('allow_exceed', checked === true, { shouldValidate: true })}
              />
              <Label htmlFor="purchase-correct-allow-exceed" className="text-xs font-normal leading-snug">
                La cantidad a comprar era {purchase.item_quantity} y esta compra quedaría {current.quantity - remaining} por
                encima de lo pedido. Confirmo que se compró de más.
              </Label>
            </div>
            {errors.allow_exceed && <p className="text-xs text-destructive">{errors.allow_exceed.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="purchase-correct-date">Fecha de la compra</Label>
          <DateField
            id="purchase-correct-date"
            value={watched.spent_at}
            onChange={(value) => setValue('spent_at', value, { shouldValidate: true })}
            disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
          />
          {errors.spent_at && <p className="text-sm text-destructive">{errors.spent_at.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchase-correct-funding">¿Con qué plata se pagó?</Label>
          <Select
            value={fundingSource}
            disabled={workerLocked}
            onValueChange={(value) => setValue('funding_source', value as FundingSource, { shouldValidate: true })}
          >
            <SelectTrigger id="purchase-correct-funding">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="company">{FUNDING_SOURCE_LABEL.company}</SelectItem>
              <SelectItem value="employee">Plata de un trabajador</SelectItem>
            </SelectContent>
          </Select>
          {workerLocked && (
            <p className="text-[11px] text-muted-foreground">
              Ya se le repuso {formatMoney(reimbursed)} a {purchase.paid_by_user_name ?? 'el trabajador'}: para cambiar quién
              la pagó, anula primero esa reposición.
            </p>
          )}
        </div>

        {fundingSource === 'employee' && (
          <div className="space-y-2">
            <Label>Trabajador que puso el dinero</Label>
            <SearchableSelect
              placeholder="Selecciona una persona"
              disabled={workerLocked}
              value={watched.paid_by_user_id ? String(watched.paid_by_user_id) : undefined}
              onChange={(value) => setValue('paid_by_user_id', Number(value), { shouldValidate: true })}
              options={workers.map((user) => ({ value: String(user.id), label: `${user.name} ${user.paternal_lastname}` }))}
            />
            <p className="text-[11px] text-muted-foreground">No sale de Caja hasta que se le reponga (Deudas a personal).</p>
            {errors.paid_by_user_id && <p className="text-sm text-destructive">{errors.paid_by_user_id.message}</p>}
          </div>
        )}

        {fundingSource === 'company' && (
          <div className="space-y-2">
            <Label htmlFor="purchase-correct-account">¿De dónde salió el dinero?</Label>
            <PaymentAccountSelect
              id="purchase-correct-account"
              companyId={accountsCompanyId}
              value={watched.payment_account_id}
              onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
            />
          </div>
        )}
        {fundingSource === 'company' && (
          <OperationNumberField id="purchase-correct-operation" error={errors.operation_number?.message} {...register('operation_number')} />
        )}

        <InvoiceQuestion
          question="¿La compra tiene factura?"
          value={invoice}
          onChange={(nextInvoice) => {
            setInvoice(nextInvoice);
            setInvoiceError(undefined);
          }}
          error={invoiceError}
          purchaseItemId={purchase.purchase_order_item_id}
          currentInvoice={purchase.invoice_id === null ? undefined : { id: purchase.invoice_id, hasFile: purchase.invoice_has_file }}
        />
        {leavesInvoice && (
          <p className="text-xs text-destructive" data-testid="invoice-will-be-deleted">
            Esa factura solo cubre esta compra: se elimina del sistema
            {purchase.invoice_has_file ? ' junto con su archivo (lo copiado a Google Drive se conserva)' : ''}.
          </p>
        )}

        {closedGuard.closedLabel && (
          <ClosedPeriodNotice periodLabel={closedGuard.closedLabel} today={closedGuard.status?.today} canAdjust={closedGuard.canAdjustClosed} />
        )}

        <CorrectionReasonField
          id="purchase-correct-reason"
          registration={register('reason')}
          error={errors.reason?.message}
          placeholder="Ej.: se registró mal la cantidad"
        />

        <CorrectionPreview changes={changes} />

        <DialogFooter>
          <Button type="submit" disabled={isPending || changes.length === 0}>
            <Check className="size-4" />
            {isPending ? 'Guardando...' : 'Guardar corrección'}
          </Button>
        </DialogFooter>
      </form>

      <ConfirmDialog
        {...confirmProps}
        title="¿Confirmas la corrección?"
        description={`${describeCorrectionChanges(changes)}. Se corrigen juntos la compra, su gasto y la deuda con el trabajador; Caja y Estadísticas se recalculan.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
