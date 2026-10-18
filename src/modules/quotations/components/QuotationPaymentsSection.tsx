import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

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
import { Button } from '@/presentation/components/shared/ui/button';
import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuotationPaymentsSectionProps {
  quotationId: number;
  payments: QuotationPayment[];
  totalPaid: number;
  balance: number;
  canRegister: boolean;
}

export function QuotationPaymentsSection({
  quotationId,
  payments,
  totalPaid,
  balance,
  canRegister,
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
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{money(payment.amount)}</p>
              <p className="text-xs text-muted-foreground">
                {payment.paid_at} {payment.method ? `· ${methodLabel(payment.method)}` : ''}
                {accountName(payment.payment_account_id) ? ` · a ${accountName(payment.payment_account_id)}` : ''}
                {payment.operation_number ? ` · Op. ${payment.operation_number}` : ''}
                {payment.actor ? ` · ${payment.actor.name} ${payment.actor.paternal_lastname}` : ''}
              </p>
              {payment.notes && <p className="mt-0.5 text-xs text-muted-foreground italic">"{payment.notes}"</p>}
            </div>
          </div>
        ))}
      </div>

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
