import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { getPaymentById, getPayments, togglePaymentStatus, updatePayment } from '@/modules/payments/api/payments.api';
import { paymentsKeys } from '@/modules/payments/hooks/payments.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import { receivablesKeys } from '@/modules/receivables/hooks/receivables.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import type { PaymentListParams, UpdatePaymentDto } from '@/modules/payments/types/payment.types';

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: paymentsKeys.list(params),
    queryFn: () => getPayments(params),
    placeholderData: keepPreviousData,
  });
}

// Un pago por id (diálogo de corrección). Solo se pide con el diálogo abierto.
// staleTime 0: se corrige sobre los datos actuales, nunca sobre una copia en
// cache (igual que los demás diálogos de corrección).
export function usePayment(id: number) {
  return useQuery({
    queryKey: paymentsKeys.detail(id),
    queryFn: () => getPaymentById(id),
    staleTime: 0,
    retry: false,
  });
}

// Un pago afecta lo que ve todo el sistema: sus listas, la cotización
// (total_paid), Por cobrar, Caja y Estadísticas. Solo esas keys.
function invalidatePaymentDependents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
  queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
  queryClient.invalidateQueries({ queryKey: receivablesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePaymentDto }) => updatePayment(id, dto),
    onSuccess: (_data, { id }) => {
      invalidatePaymentDependents(queryClient);
      queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('quotation_payment', id) });
    },
  });
}

export function useTogglePaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: togglePaymentStatus,
    onSuccess: () => invalidatePaymentDependents(queryClient),
  });
}
