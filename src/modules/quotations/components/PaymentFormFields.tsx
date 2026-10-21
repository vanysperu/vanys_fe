import type { UseFormReturn } from 'react-hook-form';

import {
  CASH_PAYMENT_METHOD,
  type CreateQuotationPaymentFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { DateField } from '@/presentation/components/shared/DateField';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

type PaymentForm = UseFormReturn<CreateQuotationPaymentFormValues>;

interface PaymentFormFieldsProps {
  form: PaymentForm;
  // Prefijo de los ids de los campos: dos formularios de pago pueden estar
  // montados a la vez (el de la pestaña Pagos y el modal de adelanto).
  idPrefix?: string;
}

// Campos de un pago (monto, fecha, método, cuenta, N° de operación,
// comentario). Lo usan "Registrar pago" de la cotización y el modal de
// adelanto al aceptarla, para que ambos pidan y validen exactamente lo mismo.
export function PaymentFormFields({ form, idPrefix = 'payment' }: PaymentFormFieldsProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  // Métodos de pago: catálogo de general_variable (category="payment_method").
  const { data: methodsResult } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });
  const paymentMethods = methodsResult?.data ?? [];
  const method = watch('method');
  const showAccountFields = Boolean(method) && method !== CASH_PAYMENT_METHOD;

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-amount`}>Monto (S/)</Label>
          <Input id={`${idPrefix}-amount`} type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-date`}>Fecha</Label>
          <DateField
            id={`${idPrefix}-date`}
            value={watch('paid_at')}
            onChange={(value) => setValue('paid_at', value, { shouldValidate: true })}
            disabled={disableFuture}
          />
          {errors.paid_at && <p className="text-xs text-destructive">{errors.paid_at.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-method`}>Método</Label>
        <Select value={method} onValueChange={(value) => setValue('method', value, { shouldValidate: true })}>
          <SelectTrigger id={`${idPrefix}-method`}>
            <SelectValue placeholder="Selecciona un método" />
          </SelectTrigger>
          <SelectContent>
            {paymentMethods.map((paymentMethod) => (
              <SelectItem key={paymentMethod.id} value={paymentMethod.prefix_id}>
                {paymentMethod.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.method && <p className="text-xs text-destructive">{errors.method.message}</p>}
      </div>

      {showAccountFields && (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-account`}>Cuenta de destino</Label>
          <PaymentAccountSelect
            id={`${idPrefix}-account`}
            allowCash={false}
            value={watch('payment_account_id')}
            onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
          />
          {errors.payment_account_id && <p className="text-xs text-destructive">{errors.payment_account_id.message}</p>}
        </div>
      )}

      {showAccountFields && (
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-operation-number`}>Número de operación</Label>
          <Input id={`${idPrefix}-operation-number`} maxLength={50} {...register('operation_number')} />
          {errors.operation_number && <p className="text-xs text-destructive">{errors.operation_number.message}</p>}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-notes`}>Comentario (opcional)</Label>
        <Textarea id={`${idPrefix}-notes`} rows={2} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
        <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
        {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
      </div>
    </>
  );
}
