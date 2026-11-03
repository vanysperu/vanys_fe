import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { ClosedPeriodNotice } from '@/modules/cashClosings/components/ClosedPeriodNotice';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import { useCorrectionLookups } from '@/modules/moneyCorrections/hooks/useCorrectionLookups';
import {
  buildCorrectionChanges,
  describeCorrectionChanges,
  formatMoney,
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { usePayment, useUpdatePayment } from '@/modules/payments/hooks/usePayments';
import {
  CASH_PAYMENT_METHOD,
  correctPaymentSchema,
  type CorrectPaymentFormValues,
} from '@/modules/payments/schemas/payment.schema';
import type { PaymentDetail, UpdatePaymentDto } from '@/modules/payments/types/payment.types';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface CorrectPaymentDialogProps {
  paymentId: number;
  onClose: () => void;
}

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Campos que se comparan para saber qué cambió de verdad.
const CORRECTABLE_FIELDS = ['amount', 'method', 'paid_at', 'payment_account_id', 'operation_number', 'notes'] as const;

// Corregir un pago de cliente (lo abren Pagos recibidos y Caja). Pide el pago
// por id (el diálogo no depende de qué lista lo abrió) y, ya cargado, arma el
// formulario con sus valores. Tras guardar, el backend recalcula lo cobrado
// de la cotización, Por cobrar, Caja y Estadísticas.
export function CorrectPaymentDialog({ paymentId, onClose }: CorrectPaymentDialogProps) {
  const { data: payment, isLoading, isError, error } = usePayment(paymentId);

  const renderBody = () => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Cargando pago...</p>;
    if (isError || !payment) {
      return <p className="text-sm text-destructive">{error?.message ?? 'No se pudo cargar el pago'}</p>;
    }
    // Un pago anulado no suma: primero se restaura (el backend responde 409).
    if (payment.is_deleted) {
      return (
        <p className="text-sm text-muted-foreground">
          Este pago está anulado: restáuralo antes de corregirlo.
        </p>
      );
    }
    return <CorrectPaymentForm payment={payment} onClose={onClose} />;
  };

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Corregir pago</DialogTitle>
          <DialogDescription>
            La corrección queda registrada en el historial del pago, con el antes, el después y el motivo.
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
      </DialogContent>
    </Dialog>
  );
}

function CorrectPaymentForm({ payment, onClose }: { payment: PaymentDetail; onClose: () => void }) {
  const { data: access } = useAccess();
  // Super Administrador: las cuentas de la empresa del pago; un usuario de
  // empresa siempre recibe las suyas.
  const accountsCompanyId = access?.isSystem ? payment.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(accountsCompanyId);
  // Si el movimiento es de un mes cerrado, la corrección se registra como ajuste.
  const closedGuard = useClosedPeriodGuard(accountsCompanyId, payment.paid_at);
  const { data: methods } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });
  const lookups = useCorrectionLookups();
  const { mutateAsync: updatePayment, isPending } = useUpdatePayment();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CorrectPaymentFormValues>({
    resolver: zodResolver(correctPaymentSchema),
    defaultValues: {
      amount: payment.amount,
      method: payment.method ?? '',
      paid_at: payment.paid_at,
      notes: payment.notes ?? undefined,
      operation_number: payment.operation_number ?? undefined,
      payment_account_id: payment.payment_account_id,
      reason: '',
    },
  });

  const confirmation = useCorrectionConfirm<UpdatePaymentDto>({
    submit: (dto) => updatePayment({ id: payment.id, dto }),
    successMessage: 'Pago corregido correctamente',
    fallbackErrorMessage: 'No se pudo corregir el pago',
    onSuccess: onClose,
  });

  const methodOptions = (methods?.data ?? []).map((item) => ({ value: item.prefix_id, label: item.name }));
  const accounts = accountsResult?.data ?? [];
  const hasAccounts = accounts.some((account) => !account.is_deleted);
  const accountName = (accountId: number | null): string | null => {
    if (accountId === null) return null;
    if (accountId === payment.payment_account_id) return payment.payment_account_name;
    return accounts.find((account) => account.id === accountId)?.name ?? null;
  };
  // La cuenta actual pudo deshabilitarse después: el selector ya no la ofrece,
  // pero si no se toca se conserva (el backend lo permite).
  const currentAccountUnavailable =
    payment.payment_account_id !== null &&
    !accounts.some((account) => account.id === payment.payment_account_id && !account.is_deleted);

  const watched = watch();
  const isCash = watched.method === CASH_PAYMENT_METHOD;

  // Lo máximo que admite este pago sin dejar la cotización sobre-pagada
  // (el backend lo vuelve a validar).
  const maxAmount = Math.max(Math.round((payment.quotation_total - payment.paid_by_others) * 100) / 100, 0);

  const before = {
    amount: payment.amount,
    method: payment.method,
    paid_at: payment.paid_at,
    payment_account_id: payment.payment_account_id,
    payment_account_name: payment.payment_account_name,
    operation_number: normalizeText(payment.operation_number),
    notes: normalizeText(payment.notes),
  };
  // Efectivo no tiene cuenta (el backend la descarta).
  const effectiveAccountId = isCash ? null : (watched.payment_account_id ?? null);
  const after = {
    amount: Number(watched.amount),
    method: watched.method ?? null,
    paid_at: watched.paid_at ?? '',
    payment_account_id: effectiveAccountId,
    payment_account_name: accountName(effectiveAccountId),
    operation_number: normalizeText(watched.operation_number),
    notes: normalizeText(watched.notes),
  };
  const { previous, next, changedFields } = pickChangedValues(before, after, CORRECTABLE_FIELDS);
  const changes = buildCorrectionChanges(previous, next, lookups);

  const onSubmit = (values: CorrectPaymentFormValues) => {
    if (changedFields.length === 0) return;
    // Misma regla que al registrar: si no es efectivo y la empresa tiene
    // cuentas, hay que decir a cuál entró.
    if (!isCash && hasAccounts && values.payment_account_id == null) {
      setError('payment_account_id', { message: 'Indica a qué cuenta (banco, Yape o Plin) entró el pago' });
      return;
    }
    if (Math.round(values.amount * 100) > Math.round(maxAmount * 100)) {
      setError('amount', { message: `Con este monto la cotización queda sobre-pagada: el máximo es ${formatMoney(maxAmount)}` });
      return;
    }
    confirmation.request({
      amount: values.amount,
      method: values.method,
      paid_at: values.paid_at,
      notes: normalizeText(values.notes) ?? undefined,
      operation_number: normalizeText(values.operation_number) ?? undefined,
      payment_account_id: isCash ? null : (values.payment_account_id ?? null),
      reason: values.reason,
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          COT-{String(payment.quotation_id).padStart(4, '0')} · {payment.client_name}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="correct-payment-amount">Monto (S/)</Label>
            <Input
              id="correct-payment-amount"
              type="number"
              step={DECIMAL_INPUT_STEP}
              {...register('amount', { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">Máximo para esta cotización: {formatMoney(maxAmount)}</p>
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-payment-date">Fecha de pago</Label>
            <DateField
              id="correct-payment-date"
              value={watched.paid_at}
              onChange={(value) => setValue('paid_at', value, { shouldValidate: true })}
              disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
            />
            {errors.paid_at && <p className="text-sm text-destructive">{errors.paid_at.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Método de pago</Label>
          <SearchableSelect
            placeholder="Selecciona un método"
            value={watched.method}
            onChange={(value) => setValue('method', value, { shouldValidate: true })}
            options={methodOptions}
          />
          {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
        </div>

        {!isCash && (
          <div className="space-y-2">
            <Label htmlFor="correct-payment-account">Cuenta de destino</Label>
            <PaymentAccountSelect
              id="correct-payment-account"
              allowCash={false}
              value={watched.payment_account_id}
              onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
              companyId={accountsCompanyId}
            />
            {currentAccountUnavailable && watched.payment_account_id === payment.payment_account_id && (
              <p className="text-[11px] text-muted-foreground">
                Cuenta actual: {payment.payment_account_name ?? `#${payment.payment_account_id}`} (ya no está disponible
                para elegir; si no la cambias, se mantiene).
              </p>
            )}
            {errors.payment_account_id && <p className="text-sm text-destructive">{errors.payment_account_id.message}</p>}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="correct-payment-operation">N.° de operación</Label>
          <Input id="correct-payment-operation" {...register('operation_number')} />
          {errors.operation_number && <p className="text-sm text-destructive">{errors.operation_number.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct-payment-notes">Notas</Label>
          <Textarea id="correct-payment-notes" rows={2} {...register('notes')} />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
        </div>

        {closedGuard.closedLabel && (
          <ClosedPeriodNotice periodLabel={closedGuard.closedLabel} today={closedGuard.status?.today} canAdjust={closedGuard.canAdjustClosed} />
        )}

        <CorrectionReasonField
          id="correct-payment-reason"
          registration={register('reason')}
          error={errors.reason?.message}
          placeholder="Ej.: el cliente depositó menos de lo anotado"
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
        {...confirmation.confirmProps}
        title="¿Confirmas la corrección?"
        description={`${describeCorrectionChanges(changes)}. Lo cobrado de la cotización, Por cobrar y Caja se recalculan y la corrección queda en el historial.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
