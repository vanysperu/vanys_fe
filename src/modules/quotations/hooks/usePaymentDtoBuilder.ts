import type { UseFormReturn } from 'react-hook-form';

import {
  CASH_PAYMENT_METHOD,
  PAYMENT_ACCOUNT_REQUIRED_MESSAGE,
  type CreateQuotationPaymentFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { CreateQuotationPaymentDto } from '@/modules/quotations/types/quotation.types';
import { usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';

// Cuentas activas de la empresa (banco/Yape/Plin) y la regla "si no es
// efectivo y hay cuentas, hay que elegir una" — la misma que revalida el
// backend. Devuelve el DTO listo para enviar, o null si falta la cuenta (y
// deja el error marcado en el formulario).
export function usePaymentDtoBuilder(form: UseFormReturn<CreateQuotationPaymentFormValues>) {
  const { data: accountsResult } = usePaymentAccounts();
  const accounts = (accountsResult?.data ?? []).filter((account) => !account.is_deleted);

  return (values: CreateQuotationPaymentFormValues): CreateQuotationPaymentDto | null => {
    const isCash = values.method === CASH_PAYMENT_METHOD;
    if (!isCash && accounts.length > 0 && values.payment_account_id == null) {
      form.setError('payment_account_id', { message: PAYMENT_ACCOUNT_REQUIRED_MESSAGE });
      return null;
    }
    return { ...values, payment_account_id: isCash ? null : (values.payment_account_id ?? null) };
  };
}
