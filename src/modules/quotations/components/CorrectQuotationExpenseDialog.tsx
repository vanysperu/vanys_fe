import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';
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
  pickChangedValues,
} from '@/modules/moneyCorrections/utils/correctionChanges';
import { useCorrectQuotationExpense, useQuotationExpense } from '@/modules/quotations/hooks/useQuotations';
import {
  correctQuotationExpenseSchema,
  type CorrectQuotationExpenseFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { CorrectQuotationExpenseDto, QuotationExpenseDetail } from '@/modules/quotations/types/quotation.types';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DateField } from '@/presentation/components/shared/DateField';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Button } from '@/presentation/components/shared/ui/button';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { useAccess } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

interface CorrectQuotationExpenseDialogProps {
  expenseId: number;
  onClose: () => void;
}

// Campos corregibles de un gasto manual, en el orden del historial.
const EXPENSE_FIELDS = ['amount', 'spent_at', 'category', 'payment_account_id', 'description'] as const;

type ExpenseFields = {
  amount: number;
  spent_at: string;
  category: string | null;
  payment_account_id: number | null;
  description: string;
};

const normalizeText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
};

// Corregir un gasto MANUAL de una cotización (desde la pestaña Gastos o desde
// Caja). Carga el gasto vigente por id; el backend corrige en el lugar y deja
// el antes/después en el historial inmutable, con quién y el motivo.
export function CorrectQuotationExpenseDialog({ expenseId, onClose }: CorrectQuotationExpenseDialogProps) {
  const { data: expense, isLoading, isError, error } = useQuotationExpense(expenseId);

  // El gasto de una compra (o uno anulado) no se corrige acá.
  const blockedReason =
    expense?.purchase_id !== null && expense?.purchase_id !== undefined
      ? 'Este gasto es una compra de una orden de compra: corrígelo desde la compra.'
      : expense?.is_deleted
        ? 'Este gasto está anulado: restáuralo antes de corregirlo.'
        : null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Corregir gasto</DialogTitle>
          <DialogDescription>
            La corrección queda registrada en el historial del gasto, con el antes, el después y el motivo.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando gasto...</p>}
        {isError && (
          <EmptyState
            icon={Info}
            title="No se pudo cargar el gasto"
            description={(error as ApiClientError | null)?.message ?? 'Inténtalo de nuevo'}
          />
        )}
        {expense && blockedReason && <EmptyState icon={Info} title="No se puede corregir" description={blockedReason} />}
        {expense && !blockedReason && <ExpenseCorrectionForm expense={expense} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ExpenseCorrectionForm({ expense, onClose }: { expense: QuotationExpenseDetail; onClose: () => void }) {
  const { data: access } = useAccess();
  // Super Administrador: las cuentas de la empresa del gasto. Un usuario de
  // empresa siempre recibe las suyas (misma key que el resto de pantallas).
  const accountsCompanyId = access?.isSystem ? expense.company_id : undefined;
  const { data: accountsResult } = usePaymentAccounts(accountsCompanyId);
  // Si el movimiento es de un mes cerrado, la corrección se registra como ajuste.
  const closedGuard = useClosedPeriodGuard(accountsCompanyId, expense.spent_at);
  const lookups = useCorrectionLookups();
  const { mutateAsync: correctExpense, isPending } = useCorrectQuotationExpense();

  const original: ExpenseFields = {
    amount: Number(expense.amount),
    spent_at: expense.spent_at,
    category: normalizeText(expense.category),
    payment_account_id: expense.payment_account_id,
    description: expense.description.trim(),
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CorrectQuotationExpenseFormValues>({
    resolver: zodResolver(correctQuotationExpenseSchema),
    defaultValues: {
      amount: original.amount,
      spent_at: original.spent_at,
      category: original.category ?? '',
      payment_account_id: original.payment_account_id,
      description: original.description,
      reason: '',
    },
  });

  const accounts = accountsResult?.data ?? [];
  const accountName = (accountId: number | null): string | null => {
    if (accountId === null) return null;
    if (accountId === expense.payment_account_id) return expense.payment_account_name;
    return accounts.find((account) => account.id === accountId)?.name ?? null;
  };
  // La cuenta actual pudo deshabilitarse después: si no se toca, se conserva.
  const currentAccountUnavailable =
    expense.payment_account_id !== null &&
    !accounts.some((account) => account.id === expense.payment_account_id && !account.is_deleted);

  const watched = watch();
  const current: ExpenseFields = {
    amount: Number(watched.amount),
    spent_at: watched.spent_at ?? '',
    category: normalizeText(watched.category),
    payment_account_id: watched.payment_account_id ?? null,
    description: watched.description?.trim() ?? '',
  };
  const toValues = (values: ExpenseFields): MoneyCorrectionValues => ({
    ...values,
    payment_account_name: accountName(values.payment_account_id),
  });
  const { previous, next, changedFields } = pickChangedValues(toValues(original), toValues(current), EXPENSE_FIELDS);
  const changes = buildCorrectionChanges(previous, next, lookups);

  const { request, confirmProps } = useCorrectionConfirm<CorrectQuotationExpenseDto>({
    submit: (dto) => correctExpense({ id: expense.id, dto }),
    successMessage: 'Gasto corregido correctamente',
    fallbackErrorMessage: 'No se pudo corregir el gasto',
    onSuccess: onClose,
  });

  // Solo se envía lo que cambió (lo ausente se queda como está).
  const onSubmit = (values: CorrectQuotationExpenseFormValues) => {
    const submitted: ExpenseFields = {
      amount: values.amount,
      spent_at: values.spent_at,
      category: normalizeText(values.category),
      payment_account_id: values.payment_account_id ?? null,
      description: values.description.trim(),
    };
    const dto = changedFields.reduce<CorrectQuotationExpenseDto>(
      (picked, field) => ({ ...picked, [field]: submitted[field as keyof ExpenseFields] }),
      { reason: values.reason },
    );
    request(dto);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="expense-correct-description">Descripción</Label>
          <Input id="expense-correct-description" maxLength={300} {...register('description')} />
          {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expense-correct-amount">Monto (S/)</Label>
            <Input
              id="expense-correct-amount"
              type="number"
              step={DECIMAL_INPUT_STEP}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-correct-date">Fecha</Label>
            <DateField
              id="expense-correct-date"
              value={watched.spent_at}
              onChange={(value) => setValue('spent_at', value, { shouldValidate: true })}
              disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
            />
            {errors.spent_at && <p className="text-sm text-destructive">{errors.spent_at.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-correct-category">Categoría (opcional)</Label>
          <Input id="expense-correct-category" maxLength={50} {...register('category')} />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expense-correct-account">¿De dónde salió el dinero?</Label>
          <PaymentAccountSelect
            id="expense-correct-account"
            companyId={accountsCompanyId}
            value={watched.payment_account_id}
            onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
          />
          {currentAccountUnavailable && watched.payment_account_id === expense.payment_account_id && (
            <p className="text-[11px] text-muted-foreground">
              Cuenta actual: {expense.payment_account_name ?? `#${expense.payment_account_id}`} (ya no está disponible
              para elegir; si no la cambias, se mantiene).
            </p>
          )}
        </div>

        {closedGuard.closedLabel && (
          <ClosedPeriodNotice periodLabel={closedGuard.closedLabel} today={closedGuard.status?.today} canAdjust={closedGuard.canAdjustClosed} />
        )}

        <CorrectionReasonField
          id="expense-correct-reason"
          registration={register('reason')}
          error={errors.reason?.message}
          placeholder="Ej.: se tipeó mal el monto del gasto"
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
        description={`${describeCorrectionChanges(changes)}. Caja, Estadísticas y el margen se recalculan; la corrección queda en el historial.`}
        confirmLabel="Sí, corregir"
        variant="default"
      />
    </>
  );
}
