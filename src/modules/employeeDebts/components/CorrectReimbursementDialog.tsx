import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { useCorrectEmployeeDebtPayment, useEmployeeDebtPaymentRecord } from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import {
  correctReimbursementSchema,
  type CorrectReimbursementFormValues,
} from '@/modules/employeeDebts/schemas/employeeDebt.schema';
import type { CorrectReimbursementDto, EmployeeDebtPaymentRecord } from '@/modules/employeeDebts/types/employeeDebt.types';
import { previewReallocation, type AllocationPreview } from '@/modules/employeeDebts/utils/reimbursementAllocation';
import { CorrectionPreview } from '@/modules/moneyCorrections/components/CorrectionPreview';
import { ClosedPeriodNotice } from '@/modules/cashClosings/components/ClosedPeriodNotice';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { useCorrectionConfirm } from '@/modules/moneyCorrections/hooks/useCorrectionConfirm';
import type { MoneyCorrectionValues } from '@/modules/moneyCorrections/types/moneyCorrection.types';
import {
  buildCorrectionChanges,
  describeCorrectionChanges,
  formatMoney,
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';
import { cn } from '@/lib/utils';

interface CorrectReimbursementDialogProps {
  reimbursementId: number;
  onClose(): void;
}

const CORRECTABLE_FIELDS = ['amount', 'paid_at', 'payment_account_id'] as const;


// Corregir una reposición a un trabajador (monto, fecha y cuenta). Se abre
// desde el detalle del trabajador y desde Caja. Pide la reposición actual al
// backend (/employee-debt/payment/find/:id) con sus deudas, y muestra en vivo
// cómo quedaría repartida entre ellas (misma regla que el backend).
export function CorrectReimbursementDialog({ reimbursementId, onClose }: CorrectReimbursementDialogProps) {
  const { data: payment, isLoading, isError, error } = useEmployeeDebtPaymentRecord(reimbursementId);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Corregir reposición</DialogTitle>
          <DialogDescription>
            {payment?.employee_name ? `Reposición a ${payment.employee_name}. ` : ''}
            Caja y lo pendiente de cada deuda se recalculan; la corrección queda en el historial.
          </DialogDescription>
        </DialogHeader>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando reposición...</p>}
        {isError && (
          <p className="text-sm text-destructive">
            {(error as ApiClientError | null)?.message ?? 'No se pudo cargar la reposición'}
          </p>
        )}
        {payment?.is_deleted && (
          <p className="text-sm text-muted-foreground">Esta reposición está anulada: registra una nueva si correspondía.</p>
        )}
        {payment && !payment.is_deleted && <ReimbursementCorrectionForm payment={payment} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ReimbursementCorrectionForm({ payment, onClose }: { payment: EmployeeDebtPaymentRecord; onClose(): void }) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  // Super Administrador: las cuentas de la empresa de la reposición.
  const accountsCompanyId = isSystem ? payment.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(accountsCompanyId);
  // Si el movimiento es de un mes cerrado, la corrección se registra como ajuste.
  const closedGuard = useClosedPeriodGuard(accountsCompanyId, payment.paid_at);
  const { mutateAsync: correctPayment, isPending } = useCorrectEmployeeDebtPayment();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CorrectReimbursementFormValues>({
    resolver: zodResolver(correctReimbursementSchema),
    defaultValues: {
      amount: payment.amount,
      paid_at: payment.paid_at,
      payment_account_id: payment.payment_account_id,
      reason: '',
    },
  });

  const accounts = accountsResult?.data ?? [];
  const accountName = (accountId: number | null): string | null => {
    if (accountId === null) return null;
    if (accountId === payment.payment_account_id) return payment.payment_account_name;
    return accounts.find((account) => account.id === accountId)?.name ?? null;
  };
  // La cuenta actual pudo deshabilitarse después: si no se toca, se conserva.
  const currentAccountUnavailable =
    payment.payment_account_id !== null &&
    !accounts.some((account) => account.id === payment.payment_account_id && !account.is_deleted);

  const watched = watch();
  const toValues = (values: { amount: number; paid_at: string; payment_account_id: number | null }): MoneyCorrectionValues => ({
    ...values,
    payment_account_name: accountName(values.payment_account_id),
  });
  const before = toValues({ amount: payment.amount, paid_at: payment.paid_at, payment_account_id: payment.payment_account_id });
  const after = toValues({
    amount: Number(watched.amount),
    paid_at: watched.paid_at ?? '',
    payment_account_id: watched.payment_account_id ?? null,
  });
  const { previous, next, changedFields } = pickChangedValues(before, after, CORRECTABLE_FIELDS);
  const changes = buildCorrectionChanges(previous, next);

  const amountValid = Number.isFinite(after.amount) && Number(after.amount) > 0;
  const preview: AllocationPreview | null = amountValid
    ? previewReallocation(payment.allocations, payment.pending_debts, Number(after.amount))
    : null;
  const exceedsPending = preview !== null && !preview.ok;

  const confirm = useCorrectionConfirm<CorrectReimbursementDto>({
    submit: (dto) => correctPayment({ id: payment.id, dto }),
    successMessage: 'Reposición corregida: Caja y las deudas del trabajador se recalcularon',
    fallbackErrorMessage: 'No se pudo corregir la reposición',
    onSuccess: onClose,
  });

  const onSubmit = (values: CorrectReimbursementFormValues) => {
    if (changedFields.length === 0 || exceedsPending) return;
    const full: Omit<CorrectReimbursementDto, 'reason'> = {
      amount: values.amount,
      paid_at: values.paid_at,
      payment_account_id: values.payment_account_id,
    };
    const dto = changedFields.reduce<CorrectReimbursementDto>(
      (picked, field) => ({ ...picked, [field]: full[field as keyof typeof full] }),
      { reason: values.reason },
    );
    confirm.request(dto);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="correct-reimbursement-amount">Monto (S/)</Label>
            <Input
              id="correct-reimbursement-amount"
              type="number"
              step={DECIMAL_INPUT_STEP}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct-reimbursement-date">Fecha en que se le repuso</Label>
            <DateField
              id="correct-reimbursement-date"
              value={watched.paid_at}
              onChange={(value) => setValue('paid_at', value, { shouldValidate: true })}
              disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
            />
            {errors.paid_at && <p className="text-sm text-destructive">{errors.paid_at.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="correct-reimbursement-account">Salió de</Label>
          <PaymentAccountSelect
            id="correct-reimbursement-account"
            value={watched.payment_account_id}
            onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
            companyId={accountsCompanyId}
          />
          {currentAccountUnavailable && watched.payment_account_id === payment.payment_account_id && (
            <p className="text-[11px] text-muted-foreground">
              Cuenta actual: {payment.payment_account_name ?? `#${payment.payment_account_id}`} (ya no está disponible para
              elegir; si no la cambias, se mantiene).
            </p>
          )}
        </div>

        <AllocationPreviewTable preview={preview} amountChanged={changedFields.includes('amount')} />

        {closedGuard.closedLabel && (
          <ClosedPeriodNotice periodLabel={closedGuard.closedLabel} today={closedGuard.status?.today} canAdjust={closedGuard.canAdjustClosed} />
        )}

        <CorrectionReasonField
          id="correct-reimbursement-reason"
          registration={register('reason')}
          error={errors.reason?.message}
          placeholder="Ej.: se le transfirió S/ 50, no S/ 60"
        />

        <CorrectionPreview changes={changes} />

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending || changes.length === 0 || exceedsPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Guardar corrección
          </Button>
        </DialogFooter>
      </form>

      <ConfirmDialog
        {...confirm.confirmProps}
        title="¿Confirmas la corrección?"
        description={`${describeCorrectionChanges(changes)}. Caja y lo pendiente de cada deuda se recalculan y la corrección queda en el historial.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}

// Cómo queda repartida la reposición entre las deudas del trabajador.
function AllocationPreviewTable({ preview, amountChanged }: { preview: AllocationPreview | null; amountChanged: boolean }) {
  if (preview === null) return null;
  if (!preview.ok) {
    return (
      <p className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        Con este monto se le repondría más de lo que se le debe: como máximo {formatMoney(preview.maxAmount)}.
      </p>
    );
  }

  return (
    <div className="min-w-0 rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        {amountChanged ? 'Cómo queda repartida entre sus deudas' : 'Deudas que cubre esta reposición'}
      </p>
      <ul className="space-y-1.5">
        {preview.lines.map(({ line, beforeAmount, afterAmount }) => (
          <li key={line.employee_debt_id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {line.description}
              <span className="block text-[10px] text-muted-foreground">
                {line.origin === 'manual' ? 'Deuda manual' : 'Compra de orden'} · {formatDate(line.incurred_at)} · deuda de{' '}
                {formatMoney(line.debt_amount)}
              </span>
            </span>
            <span className="shrink-0 whitespace-nowrap text-right">
              {beforeAmount !== afterAmount && (
                <span className="mr-1 text-muted-foreground line-through">{formatMoney(beforeAmount)}</span>
              )}
              <span className={cn('font-medium', afterAmount === 0 && 'text-muted-foreground')}>{formatMoney(afterAmount)}</span>
            </span>
          </li>
        ))}
      </ul>
      {amountChanged && preview.lines.some((item) => item.afterAmount === 0) && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Las deudas en S/ 0.00 dejan de estar cubiertas por esta reposición y vuelven a quedar pendientes.
        </p>
      )}
    </div>
  );
}
