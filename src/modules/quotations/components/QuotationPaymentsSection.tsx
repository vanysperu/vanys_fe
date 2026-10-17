import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useCreateQuotationPayment } from '@/modules/quotations/hooks/useQuotations';
import {
  CASH_PAYMENT_METHOD,
  createQuotationPaymentSchema,
  type CreateQuotationPaymentFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { QuotationPayment } from '@/modules/quotations/types/quotation.types';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { DateField } from '@/presentation/components/shared/DateField';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
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
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateQuotationPaymentFormValues>({
    resolver: zodResolver(createQuotationPaymentSchema),
    defaultValues: { paid_at: todayLocalDateString() },
  });

  const onSubmit = (values: CreateQuotationPaymentFormValues) => {
    createPayment(values, {
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
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="payment-amount">Monto (S/)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment-date">Fecha</Label>
                  <DateField
                    id="payment-date"
                    value={watch('paid_at')}
                    onChange={(value) => setValue('paid_at', value, { shouldValidate: true })}
                    disabled={disableFuture}
                  />
                  {errors.paid_at && <p className="text-xs text-destructive">{errors.paid_at.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="payment-method">Método</Label>
                <Select value={watch('method')} onValueChange={(value) => setValue('method', value)}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.prefix_id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.method && <p className="text-xs text-destructive">{errors.method.message}</p>}
              </div>

              {watch('method') && watch('method') !== CASH_PAYMENT_METHOD && (
                <div className="space-y-1">
                  <Label htmlFor="payment-operation-number">Número de operación</Label>
                  <Input
                    id="payment-operation-number"
                    maxLength={50}
                    {...register('operation_number')}
                  />
                  {errors.operation_number && (
                    <p className="text-xs text-destructive">{errors.operation_number.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="payment-notes">Comentario (opcional)</Label>
                <Textarea id="payment-notes" rows={2} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
                <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
                {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
              </div>

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
