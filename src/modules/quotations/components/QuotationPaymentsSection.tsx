import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Pencil, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';
import { CorrectedBadge } from '@/modules/moneyCorrections/components/CorrectedBadge';
import { CorrectionHistoryDialog } from '@/modules/moneyCorrections/components/CorrectionHistoryDialog';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { CorrectPaymentDialog } from '@/modules/payments/components/CorrectPaymentDialog';
import { useTogglePaymentStatus } from '@/modules/payments/hooks/usePayments';
import { PaymentFormFields } from '@/modules/quotations/components/PaymentFormFields';
import { usePaymentDtoBuilder } from '@/modules/quotations/hooks/usePaymentDtoBuilder';
import { useCreateQuotationPayment } from '@/modules/quotations/hooks/useQuotations';
import {
  createQuotationPaymentSchema,
  type CreateQuotationPaymentFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import { usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import type { QuotationPayment } from '@/modules/quotations/types/quotation.types';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Button } from '@/presentation/components/shared/ui/button';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';
import { formatDate, todayLocalDateString } from '@/lib/dateUtils';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuotationPaymentsSectionProps {
  quotationId: number;
  payments: QuotationPayment[];
  totalPaid: number;
  balance: number;
  canRegister: boolean;
  // Empresa de la cotización: para saber si un pago es de un mes cerrado
  // (importa para el Super Administrador, que ve varias empresas).
  companyId?: number;
}

export function QuotationPaymentsSection({
  quotationId,
  payments,
  totalPaid,
  balance,
  canRegister,
  companyId,
}: QuotationPaymentsSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const { mutate: createPayment, isPending } = useCreateQuotationPayment(quotationId);
  // Métodos de pago: catálogo de general_variable (category="payment_method",
  // globales + los que la empresa haya agregado desde Variables Generales) —
  // mismo patrón que las etapas de producción, en vez de texto libre.
  const { data: methodsResult } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });
  const paymentMethods = methodsResult?.data ?? [];
  // Pagos ya existentes en BD pueden traer el nombre viejo en vez del
  // prefix_id (formato anterior) — se resuelve por cualquiera de los dos
  // para no romper el historial.
  const methodLabel = (value: string | null) =>
    paymentMethods.find((method) => method.prefix_id === value || method.name === value)?.name ?? value;
  const form = useForm<CreateQuotationPaymentFormValues>({
    resolver: zodResolver(createQuotationPaymentSchema),
    defaultValues: { paid_at: todayLocalDateString() },
  });
  const { handleSubmit, reset } = form;
  // Cuenta de destino obligatoria si no es efectivo (ver PaymentFormFields).
  const buildPaymentDto = usePaymentDtoBuilder(form);

  // Nombre de la cuenta para el historial (incluye cuentas ya deshabilitadas:
  // un pago viejo debe seguir mostrando a dónde entró).
  const { data: accountsResult } = usePaymentAccounts();
  const accountName = (id: number | null) => accountsResult?.data.find((account) => account.id === id)?.name ?? null;

  // Corregir / anular desde la misma cotización (pedido del usuario, 19-nov):
  // antes solo se podía en la página Pagos, y un pago mal registrado terminaba
  // "parchado" con otro pago o un ingreso manual en Caja. Mismos permisos,
  // diálogos y reglas que esa página; el backend recalcula total_paid y Caja
  // se calcula en vivo desde los pagos, así que queda cuadrada sola.
  const canCorrect = usePermissionButton('payment.update.button');
  const canToggle = usePermissionButton('payment.disable.button');
  const canOpenHistory = usePermissionButton('payment.corrections.button');
  const [correctingPaymentId, setCorrectingPaymentId] = useState<number | null>(null);
  const [historyPayment, setHistoryPayment] = useState<QuotationPayment | null>(null);
  const [togglingPayment, setTogglingPayment] = useState<QuotationPayment | null>(null);
  const { mutateAsync: togglePayment, isPending: isToggling } = useTogglePaymentStatus();
  // Un pago de un mes cerrado se anula/restaura como ajuste y pide motivo.
  const closedGuard = useClosedPeriodGuard(companyId, undefined);
  const adjustmentReason = useAdjustmentReason<QuotationPayment>({
    run: (payment, reason) => togglePayment({ id: payment.id, reason }),
    successMessage: (payment) =>
      payment.is_deleted ? 'Pago restaurado como ajuste de un mes cerrado' : 'Pago anulado como ajuste de un mes cerrado',
    fallbackErrorMessage: 'No se pudo cambiar el pago',
  });
  const requestToggle = (payment: QuotationPayment) => {
    const closedLabel = closedPeriodLabelOf(closedGuard.status, payment.paid_at);
    if (closedLabel) {
      adjustmentReason.open(payment, payment.is_deleted ? 'restore' : 'annul', closedLabel);
      return;
    }
    setTogglingPayment(payment);
  };
  const confirmToggle = async () => {
    if (!togglingPayment) return;
    const wasDeleted = togglingPayment.is_deleted;
    // try/catch solo para cerrar la confirmación y avisar (o pedir el motivo
    // si el servidor dice que es de un mes cerrado).
    try {
      await togglePayment({ id: togglingPayment.id });
      toast.success(wasDeleted ? 'Pago restaurado' : 'Pago anulado');
    } catch (mutationError) {
      if (adjustmentReason.absorbError(mutationError, togglingPayment, wasDeleted ? 'restore' : 'annul')) return;
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo cambiar el pago');
    } finally {
      setTogglingPayment(null);
    }
  };

  const onSubmit = (values: CreateQuotationPaymentFormValues) => {
    const dto = buildPaymentDto(values);
    if (!dto) return;
    createPayment(dto, {
      onSuccess: () => {
        toast.success('Pago registrado');
        reset({ paid_at: todayLocalDateString() });
        setFormOpen(false);
      },
      onError: (error) => toast.error((error as ApiClientError).message),
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Pagado</p>
          <p className="text-base font-semibold text-[var(--success)]">{money(totalPaid)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p className="text-base font-semibold">{money(balance)}</p>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {payments.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sin pagos registrados.</p>}
        {payments.map((payment) => {
          // Mes cerrado sin permiso de ajustar (cash_closing.adjust.button): sin acciones.
          const locked = closedGuard.actionsLocked(payment.paid_at);
          const showCorrect = canCorrect && !payment.is_deleted && !locked;
          const showToggle = canToggle && !locked;
          return (
            <div
              key={payment.id}
              data-testid={`quotation-payment-${payment.id}`}
              className={cn('flex items-start justify-between gap-3 px-3 py-2 text-sm', payment.is_deleted && 'opacity-60')}
            >
              <div className="min-w-0">
                {/* Un pago anulado se ve tachado y no suma (total_paid ya lo excluye). */}
                <p className={cn('font-medium', payment.is_deleted && 'line-through')}>{money(payment.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.is_deleted && <span className="font-medium text-destructive">Anulado · </span>}
                  {formatDate(payment.paid_at)} {payment.method ? `· ${methodLabel(payment.method)}` : ''}
                  {accountName(payment.payment_account_id) ? ` · a ${accountName(payment.payment_account_id)}` : ''}
                  {payment.operation_number ? ` · Op. ${payment.operation_number}` : ''}
                  {payment.actor ? ` · ${payment.actor.name} ${payment.actor.paternal_lastname}` : ''}
                  <CorrectedBadge
                    count={payment.corrections_count ?? 0}
                    canOpen={canOpenHistory}
                    onOpen={() => setHistoryPayment(payment)}
                  />
                </p>
                {payment.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">"{payment.notes}"</p>}
              </div>
              {(showCorrect || showToggle) && (
                <div className="flex shrink-0 items-center">
                  {showCorrect && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      title="Corregir pago"
                      aria-label="Corregir pago"
                      onClick={() => setCorrectingPaymentId(payment.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {showToggle && (
                    <ToggleStatusButton
                      active={!payment.is_deleted}
                      disabled={isToggling}
                      onToggle={() => requestToggle(payment)}
                      entityLabel="pago"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {correctingPaymentId !== null && (
        <CorrectPaymentDialog paymentId={correctingPaymentId} onClose={() => setCorrectingPaymentId(null)} />
      )}
      {historyPayment && (
        <CorrectionHistoryDialog
          title={`Pago de ${money(historyPayment.amount)} del ${formatDate(historyPayment.paid_at)}`}
          historyUrl={`/payment/${historyPayment.id}/corrections`}
          queryKey={moneyCorrectionsKeys.history('quotation_payment', historyPayment.id)}
          onClose={() => setHistoryPayment(null)}
        />
      )}
      {adjustmentReason.dialog}
      <ConfirmDialog
        open={togglingPayment !== null}
        onOpenChange={(open) => !open && setTogglingPayment(null)}
        title={togglingPayment?.is_deleted ? '¿Restaurar este pago?' : '¿Anular este pago?'}
        description={
          togglingPayment?.is_deleted
            ? 'Vuelve a sumar en lo pagado de la cotización, en Caja y en Estadísticas.'
            : 'Deja de sumar en lo pagado de la cotización, en Caja y en Estadísticas. Se puede restaurar después.'
        }
        confirmLabel={togglingPayment?.is_deleted ? 'Sí, restaurar' : 'Sí, anular'}
        variant={togglingPayment?.is_deleted ? 'default' : 'destructive'}
        onConfirm={confirmToggle}
      />

      {canRegister && (
        <div>
          {!formOpen ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Registrar pago
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-lg border p-3">
              <PaymentFormFields form={form} />

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  <Check className="size-4" />
                  Guardar pago
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
