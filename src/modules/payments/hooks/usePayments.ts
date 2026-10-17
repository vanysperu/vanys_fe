import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getPayments, togglePaymentStatus, updatePayment } from '@/modules/payments/api/payments.api';
import { paymentsKeys } from '@/modules/payments/hooks/payments.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import type { PaymentListParams, UpdatePaymentDto } from '@/modules/payments/types/payment.types';

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: paymentsKeys.list(params),
    queryFn: () => getPayments(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePaymentDto }) => updatePayment(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
    },
  });
}

export function useTogglePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: togglePaymentStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
    },
  });
}
