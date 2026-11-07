import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Ban, Check, Pencil, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { CorrectedBadge } from '@/modules/moneyCorrections/components/CorrectedBadge';
import { CorrectionHistoryDialog } from '@/modules/moneyCorrections/components/CorrectionHistoryDialog';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { CorrectPurchaseDialog } from '@/modules/purchaseOrders/components/CorrectPurchaseDialog';
import { usePurchaseAnnulment } from '@/modules/purchaseOrders/hooks/usePurchaseAnnulment';
import { quotationExpenseCorrectionsUrl } from '@/modules/quotations/api/quotations.api';
import { CorrectQuotationExpenseDialog } from '@/modules/quotations/components/CorrectQuotationExpenseDialog';
import { useCreateQuotationExpense, useToggleQuotationExpenseStatus } from '@/modules/quotations/hooks/useQuotations';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import {
  createQuotationExpenseSchema,
  type CreateQuotationExpenseFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { QuotationExpense } from '@/modules/quotations/types/quotation.types';
import { ExpenseFundingFields } from '@/modules/quotations/components/ExpenseFundingFields';
import { useExpenseWorkers } from '@/modules/quotations/hooks/useExpenseWorkers';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { OperationNumberField } from '@/presentation/components/shared/OperationNumberField';
import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';
import { DateField } from '@/presentation/components/shared/DateField';
import { ExpandableText } from '@/presentation/components/shared/ExpandableText';
import { combineDisabled, disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import type { ApiClientError } from '@/config/api.types';
import { formatDate, todayLocalDateString } from '@/lib/dateUtils';
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuotationExpensesSectionProps {
  quotationId: number;
  expenses: QuotationExpense[];
  canRegister: boolean;
  // Empresa de la cotización: el selector de cuenta solo ofrece las suyas
  // (importa para el Super Administrador, que ve varias empresas).
  companyId?: number;
}

const newExpenseValues = () => ({
  spent_at: todayLocalDateString(),
  funding_source: 'company' as const,
  paid_by_user_id: null,
  payment_account_id: null,
});

export function QuotationExpensesSection({ quotationId, expenses, canRegister, companyId }: QuotationExpensesSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  // Un gasto no se puede fechar en un mes cerrado.
  const closedGuard = useClosedPeriodGuard(companyId, undefined);
  const { mutate: createExpense, isPending } = useCreateQuotationExpense(quotationId);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateQuotationExpenseFormValues>({
    resolver: zodResolver(createQuotationExpenseSchema),
    defaultValues: newExpenseValues(),
  });
  const fundingSource = watch('funding_source');
  const workers = useExpenseWorkers(companyId, fundingSource === 'employee');

  // Un gasto (o compra) anulado se ve tachado pero no suma.
  const total = expenses.filter((expense) => !expense.is_deleted).reduce((sum, expense) => sum + Number(expense.amount), 0);

  // Acciones de corrección (solo administradores, según /auth/my-access).
  const canCorrectExpense = usePermissionButton('cotizacion.expense.update.button');
  const canToggleExpense = usePermissionButton('cotizacion.expense.disable.button');
  const canOpenHistory = usePermissionButton('cotizacion.expense.corrections.button');
  const canCorrectPurchase = usePermissionButton('purchase_order.purchase.update.button');
  const canAnnulPurchase = usePermissionButton('purchase_order.purchase.disable.button');
  const { requestAnnul, dialog: annulDialog } = usePurchaseAnnulment(companyId);
  const [correctingExpenseId, setCorrectingExpenseId] = useState<number | null>(null);
  const [correctingPurchaseId, setCorrectingPurchaseId] = useState<number | null>(null);
  const [historyExpense, setHistoryExpense] = useState<QuotationExpense | null>(null);
  const [togglingExpense, setTogglingExpense] = useState<QuotationExpense | null>(null);
  const { mutateAsync: toggleExpense } = useToggleQuotationExpenseStatus();
  // Anular/restaurar un gasto de un mes cerrado se registra como ajuste y pide motivo.
  const adjustmentReason = useAdjustmentReason<QuotationExpense>({
    run: (expense, reason) => toggleExpense({ id: expense.id, reason }),
    successMessage: (expense) => (expense.is_deleted ? 'Gasto restaurado como ajuste de un mes cerrado' : 'Gasto anulado como ajuste de un mes cerrado'),
    fallbackErrorMessage: 'No se pudo cambiar el gasto',
  });
  const requestToggle = (expense: QuotationExpense) => {
    const closedLabel = closedPeriodLabelOf(closedGuard.status, expense.spent_at);
    if (closedLabel) {
      adjustmentReason.open(expense, expense.is_deleted ? 'restore' : 'annul', closedLabel);
      return;
    }
    setTogglingExpense(expense);
  };

  const confirmToggle = async () => {
    if (!togglingExpense) return;
    const wasDeleted = togglingExpense.is_deleted;
    // try/catch solo para cerrar la confirmación y avisar.
    try {
      await toggleExpense({ id: togglingExpense.id });
      toast.success(wasDeleted ? 'Gasto restaurado' : 'Gasto anulado');
    } catch (mutationError) {
      if (adjustmentReason.absorbError(mutationError, togglingExpense, wasDeleted ? 'restore' : 'annul')) return;
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo cambiar el gasto');
    } finally {
      setTogglingExpense(null);
    }
  };

  const onSubmit = (values: CreateQuotationExpenseFormValues) => {
    const paidByWorker = values.funding_source === 'employee';
    if (paidByWorker && !values.paid_by_user_id && workers.length > 0) {
      setError('paid_by_user_id', { message: 'Selecciona qué trabajador puso el dinero' });
      return;
    }
    // Con plata de un trabajador no hay cuenta ni operación de la empresa.
    const dto = {
      ...values,
      paid_by_user_id: paidByWorker ? values.paid_by_user_id : null,
      payment_account_id: paidByWorker ? null : values.payment_account_id,
      operation_number: paidByWorker ? null : values.operation_number,
    };
    createExpense(dto, {
      onSuccess: () => {
        toast.success(paidByWorker ? 'Gasto registrado: quedó la deuda con el trabajador' : 'Gasto registrado');
        reset(newExpenseValues());
        setFormOpen(false);
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/50 px-3 py-2">
        <p className="text-xs text-muted-foreground">Total gastado</p>
        <p className="text-base font-semibold text-destructive">{money(total)}</p>
      </div>

      <div className="space-y-2">
        {expenses.length === 0 && (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Sin gastos registrados.</p>
        )}
        {expenses.map((expense) => {
          const isPurchase = expense.purchase_id !== null;
          // Mes cerrado sin permiso de ajustar (cash_closing.adjust.button): sin acciones.
          const locked = closedGuard.actionsLocked(expense.spent_at);
          const canCorrect = !expense.is_deleted && !locked && (isPurchase ? canCorrectPurchase : canCorrectExpense);
          const canToggle = !isPurchase && canToggleExpense && !locked;
          const canAnnul = isPurchase && !expense.is_deleted && !locked && canAnnulPurchase;
          return (
          <div key={expense.id} className={cn('space-y-1 rounded-lg border p-3', expense.is_deleted && 'opacity-60')}>
            <div className="flex items-start justify-between gap-3">
              <ExpandableText
                text={expense.description}
                className={cn('min-w-0 flex-1 font-medium', expense.is_deleted && 'line-through')}
              />
              <span className={cn('font-mono-nums shrink-0 font-semibold text-destructive', expense.is_deleted && 'line-through')}>
                {money(expense.amount)}
              </span>
              {(canCorrect || canToggle || canAnnul) && (
                <div className="flex shrink-0 items-center">
                  {canCorrect && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title={isPurchase ? 'Corregir compra' : 'Corregir gasto'}
                      aria-label={isPurchase ? 'Corregir compra' : 'Corregir gasto'}
                      onClick={() =>
                        isPurchase ? setCorrectingPurchaseId(expense.purchase_id) : setCorrectingExpenseId(expense.id)
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {/* Una compra se anula como compra: arrastra su gasto, su deuda y su factura. */}
                  {canAnnul && expense.purchase_id !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Anular compra"
                      aria-label="Anular compra"
                      onClick={() =>
                        requestAnnul({
                          id: expense.purchase_id as number,
                          amount: Number(expense.amount),
                          spent_at: expense.spent_at,
                          funding_source: expense.purchase_funding_source ?? 'company',
                          label: expense.description,
                        })
                      }
                    >
                      <Ban className="size-4 text-destructive" />
                    </Button>
                  )}
                  {canToggle && (
                    <ToggleStatusButton
                      active={!expense.is_deleted}
                      onToggle={() => requestToggle(expense)}
                      entityLabel="gasto"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {expense.is_deleted && <span className="font-medium text-destructive">Anulado ·</span>}
              {isPurchase && <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium">Compra</span>}
              <span>{formatDate(expense.spent_at)}</span>
              {expense.category && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium capitalize">{expense.category}</span>
              )}
              {expense.operation_number && <span>· Op. {expense.operation_number}</span>}
              {expense.paid_by_user_name && (
                <span className="text-warning">
                  · Pagó {expense.paid_by_user_name} con su plata ({expense.debt_status === 'paid' ? 'ya repuesto' : 'falta reponerle'})
                </span>
              )}
              {expense.actor && (
                <span>
                  · {expense.actor.name} {expense.actor.paternal_lastname}
                </span>
              )}
              <CorrectedBadge
                count={expense.corrections_count}
                canOpen={canOpenHistory}
                onOpen={() => setHistoryExpense(expense)}
              />
            </div>
          </div>
          );
        })}
      </div>

      {correctingExpenseId !== null && (
        <CorrectQuotationExpenseDialog expenseId={correctingExpenseId} onClose={() => setCorrectingExpenseId(null)} />
      )}
      {correctingPurchaseId !== null && (
        <CorrectPurchaseDialog purchaseId={correctingPurchaseId} onClose={() => setCorrectingPurchaseId(null)} />
      )}
      {historyExpense && (
        <CorrectionHistoryDialog
          title={historyExpense.description}
          historyUrl={quotationExpenseCorrectionsUrl(historyExpense.id)}
          queryKey={moneyCorrectionsKeys.history('quotation_expense', historyExpense.id)}
          onClose={() => setHistoryExpense(null)}
        />
      )}
      {adjustmentReason.dialog}
      {annulDialog}
      <ConfirmDialog
        open={togglingExpense !== null}
        onOpenChange={(open) => !open && setTogglingExpense(null)}
        title={togglingExpense?.is_deleted ? '¿Restaurar este gasto?' : '¿Anular este gasto?'}
        description={
          togglingExpense?.is_deleted
            ? 'Vuelve a sumar en Caja, Estadísticas y el margen de la cotización.'
            : 'Deja de sumar en Caja, Estadísticas y el margen de la cotización. Se puede restaurar después.'
        }
        confirmLabel={togglingExpense?.is_deleted ? 'Sí, restaurar' : 'Sí, anular'}
        variant={togglingExpense?.is_deleted ? 'default' : 'destructive'}
        onConfirm={confirmToggle}
      />

      {canRegister && (
        <div>
          {!formOpen ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Registrar gasto
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="expense-description">Descripción</Label>
                <Input
                  id="expense-description"
                  placeholder="Tela, envío, insumos…"
                  maxLength={300}
                  {...register('description')}
                />
                <div className="flex items-center justify-between">
                  {errors.description ? (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  ) : (
                    <span />
                  )}
                  <CharCounter value={watch('description')} max={300} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="expense-amount">Monto (S/)</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step={DECIMAL_INPUT_STEP}
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expense-date">Fecha</Label>
                  <DateField
                    id="expense-date"
                    value={watch('spent_at')}
                    onChange={(value) => setValue('spent_at', value, { shouldValidate: true })}
                    disabled={combineDisabled(disableFuture, closedGuard.lockedDates)}
                  />
                  {errors.spent_at && <p className="text-xs text-destructive">{errors.spent_at.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="expense-category">Categoría (opcional)</Label>
                <Input id="expense-category" placeholder="Insumos, envío…" maxLength={50} {...register('category')} />
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <ExpenseFundingFields
                idPrefix="expense"
                fundingSource={fundingSource}
                paidByUserId={watch('paid_by_user_id')}
                workers={workers}
                onFundingChange={(value) => setValue('funding_source', value, { shouldValidate: true })}
                onWorkerChange={(value) => setValue('paid_by_user_id', value, { shouldValidate: true })}
                workerError={errors.paid_by_user_id?.message}
              />
              {/* De dónde salió el dinero: así Caja descuenta de la cuenta
                  correcta (antes todo gasto figuraba como efectivo). */}
              {fundingSource === 'company' && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="expense-account">¿De dónde salió el dinero?</Label>
                    <PaymentAccountSelect
                      id="expense-account"
                      companyId={companyId}
                      value={watch('payment_account_id')}
                      onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
                    />
                  </div>
                  <OperationNumberField id="expense-operation" error={errors.operation_number?.message} {...register('operation_number')} />
                </>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  <Check className="size-4" />
                  Guardar gasto
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
