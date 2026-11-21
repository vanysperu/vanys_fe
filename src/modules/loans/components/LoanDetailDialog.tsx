import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
import { formatSoles } from '@/lib/money';
import { cn } from '@/lib/utils';
import { useCashPeriodStatus } from '@/modules/cashClosings/hooks/useCashClosings';
import { lockedDatesExcept } from '@/modules/cashClosings/utils/period';
import { LoanStatusBadge } from '@/modules/loans/components/LoanStatusBadge';
import { useCreateLoanPayment, useDisableLoanPayment, useLoan } from '@/modules/loans/hooks/useLoans';
import { loanPaymentSchema, type LoanPaymentFormValues } from '@/modules/loans/schemas/loan.schema';
import type { LoanDetail, LoanPayment } from '@/modules/loans/types/loan.types';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

function Figure({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-3', strong && 'border-primary/40 bg-primary/5')}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="font-mono-nums text-base font-semibold">{value}</p>
    </div>
  );
}

const toNullableText = (value: string | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// "Registrar cobro": por defecto, todo el saldo. El backend reparte el cobro
// en capital e interés y nunca deja cobrar más que el saldo.
function PaymentForm({ loan }: { loan: LoanDetail }) {
  const { mutate: pay, isPending } = useCreateLoanPayment(loan.id);
  const { data: periodStatus } = useCashPeriodStatus(loan.company_id);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoanPaymentFormValues>({
    resolver: zodResolver(loanPaymentSchema),
    defaultValues: { amount: loan.balance, payment_account_id: null },
  });

  useEffect(() => {
    reset({ amount: loan.balance, payment_account_id: null });
  }, [loan.balance, reset]);

  const onSubmit = (values: LoanPaymentFormValues) => {
    pay(
      {
        amount: values.amount,
        paid_at: values.paid_at,
        payment_account_id: values.payment_account_id ?? null,
        operation_number: toNullableText(values.operation_number),
        notes: toNullableText(values.notes),
      },
      {
        onSuccess: (updated) =>
          toast.success(updated.balance <= 0 ? 'Cobro registrado: el préstamo quedó pagado' : 'Cobro registrado'),
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-dashed p-3" noValidate>
      <p className="text-sm font-semibold">Registrar cobro</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="loan-payment-amount" className="text-xs">
            Monto (S/)
          </Label>
          <Input id="loan-payment-amount" type="number" step={DECIMAL_INPUT_STEP} {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="loan-payment-date" className="text-xs">
            Fecha
          </Label>
          <DateField
            id="loan-payment-date"
            value={watch('paid_at')}
            onChange={(value) => setValue('paid_at', value, { shouldValidate: true })}
            disabled={combineDisabled(disableFuture, lockedDatesExcept(periodStatus))}
          />
          {errors.paid_at && <p className="text-xs text-destructive">{errors.paid_at.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="loan-payment-account" className="text-xs">
            Entra a
          </Label>
          <PaymentAccountSelect
            id="loan-payment-account"
            value={watch('payment_account_id')}
            onChange={(value) => setValue('payment_account_id', value)}
            cashLabel="Efectivo"
            companyId={loan.company_id}
          />
        </div>
      </div>
      <OperationNumberField id="loan-payment-operation" error={errors.operation_number?.message} {...register('operation_number')} />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          <Check className="size-4" />
          {isPending ? 'Guardando...' : 'Registrar cobro'}
        </Button>
      </div>
    </form>
  );
}

function PaymentsTable({ payments, canAnnul, onAnnul }: { payments: LoanPayment[]; canAnnul: boolean; onAnnul: (payment: LoanPayment) => void }) {
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay cobros.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" data-testid="loan-payments">
        <thead className="bg-muted/50 text-left text-xs">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2 text-right">Cobrado</th>
            <th className="px-3 py-2 text-right">Capital</th>
            <th className="px-3 py-2 text-right">Interés</th>
            <th className="px-3 py-2">Cuenta</th>
            <th className="px-3 py-2">Registró</th>
            <th className="px-3 py-2" aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id} className={cn('border-t', !payment.active && 'text-muted-foreground line-through')}>
              <td className="px-3 py-2 whitespace-nowrap">{formatDate(payment.paid_at)}</td>
              <td className="px-3 py-2 text-right font-mono-nums font-semibold whitespace-nowrap">{formatSoles(payment.amount)}</td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap">{formatSoles(payment.principal_part)}</td>
              <td className="px-3 py-2 text-right font-mono-nums whitespace-nowrap text-success">{formatSoles(payment.interest_part)}</td>
              <td className="px-3 py-2">
                {payment.payment_account_name ?? 'Efectivo'}
                {payment.operation_number && <span className="block text-[11px]">Op. {payment.operation_number}</span>}
              </td>
              <td className="px-3 py-2 text-xs">{payment.created_by_name ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                {payment.active ? (
                  canAnnul && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      aria-label={`Anular el cobro del ${formatDate(payment.paid_at)}`}
                      title="Anular cobro"
                      onClick={() => onAnnul(payment)}
                    >
                      <Ban className="size-3.5" />
                    </Button>
                  )
                ) : (
                  <Badge variant="muted">Anulado</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface LoanDetailDialogProps {
  loanId: number | null;
  onClose: () => void;
}

// Detalle de un préstamo (21-nov): cuánto se prestó, el interés, lo cobrado y
// el saldo; los cobros (con su capital e interés) y "Registrar cobro".
export function LoanDetailDialog({ loanId, onClose }: LoanDetailDialogProps) {
  const { data: loan, isLoading } = useLoan(loanId);
  const canPay = usePermissionButton('loan.payment.create.button');
  const canAnnulPayment = usePermissionButton('loan.payment.disable.button');
  const { mutate: annulPayment } = useDisableLoanPayment();
  const [annulling, setAnnulling] = useState<LoanPayment | null>(null);

  return (
    <Dialog open={loanId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent expandable className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            Préstamo a {loan?.borrower_name ?? '…'}
            {loan && <LoanStatusBadge status={loan.status} />}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !loan ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Figure label="Prestado" value={formatSoles(loan.principal)} />
              <Figure label={`Interés (${loan.interest_rate}%)`} value={formatSoles(loan.interest_amount)} />
              <Figure label="Total a cobrar" value={formatSoles(loan.total_due)} />
              <Figure label="Cobrado" value={formatSoles(loan.paid_amount)} />
              <Figure label="Saldo" value={formatSoles(loan.balance)} strong />
            </div>
            <p className="text-xs text-muted-foreground">
              Prestado el {formatDate(loan.loaned_at)} desde {loan.payment_account_name ?? 'Efectivo'}
              {loan.operation_number ? ` (op. ${loan.operation_number})` : ''}
              {loan.due_date ? ` · vence el ${formatDate(loan.due_date)}` : ''}
              {loan.borrower_document ? ` · documento ${loan.borrower_document}` : ''}
              {loan.borrower_phone ? ` · cel. ${loan.borrower_phone}` : ''}
            </p>
            {loan.notes && <p className="rounded-md bg-muted px-3 py-2 text-sm">{loan.notes}</p>}

            {loan.active && loan.balance > 0 && canPay && <PaymentForm loan={loan} />}

            <section className="space-y-2">
              <p className="text-sm font-semibold">Cobros</p>
              <PaymentsTable payments={loan.payments} canAnnul={canAnnulPayment && loan.active} onAnnul={setAnnulling} />
              <p className="text-[11px] text-muted-foreground">
                Cada cobro se reparte entre capital e interés en la misma proporción del préstamo. El capital vuelve a la caja;
                el interés es ingreso de la empresa.
              </p>
            </section>
          </div>
        )}

        <ConfirmDialog
          open={annulling !== null}
          onOpenChange={(open) => !open && setAnnulling(null)}
          title="¿Anular este cobro?"
          description={annulling ? `El cobro de ${formatSoles(annulling.amount)} del ${formatDate(annulling.paid_at)} deja de contar en Caja y el saldo vuelve a subir. Si hacía falta, se registra de nuevo.` : ''}
          confirmLabel="Anular cobro"
          onConfirm={() => {
            if (!annulling) return;
            annulPayment(annulling.id, {
              onSuccess: () => toast.success('Cobro anulado'),
              onError: (error) => toast.error((error as ApiClientError).message),
            });
            setAnnulling(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
