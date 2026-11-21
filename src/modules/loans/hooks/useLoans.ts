import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import {
  createLoan,
  createLoanPayment,
  disableLoanPayment,
  getLoan,
  getLoans,
  toggleLoan,
  updateLoan,
} from '@/modules/loans/api/loans.api';
import { loansKeys } from '@/modules/loans/hooks/loans.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import type { CreateLoanPaymentDto, LoanListParams, SaveLoanDto } from '@/modules/loans/types/loan.types';

export function useLoans(params: LoanListParams) {
  return useQuery({
    queryKey: loansKeys.list(params),
    queryFn: () => getLoans(params),
    placeholderData: keepPreviousData,
  });
}

export function useLoan(id: number | null) {
  return useQuery({
    queryKey: loansKeys.detail(id ?? 0),
    queryFn: () => getLoan(id as number),
    enabled: id !== null,
  });
}

// Todo cambio de un préstamo mueve Caja (salida, capital, interés), el
// resultado del mes y los cierres: se refrescan junto con los préstamos.
function invalidateLoanViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: loansKeys.all });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
}

export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createLoan, onSuccess: () => invalidateLoanViews(queryClient) });
}

export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SaveLoanDto }) => updateLoan(id, dto),
    onSuccess: () => invalidateLoanViews(queryClient),
  });
}

export function useToggleLoanStatus() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: toggleLoan, onSuccess: () => invalidateLoanViews(queryClient) });
}

export function useCreateLoanPayment(loanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateLoanPaymentDto) => createLoanPayment(loanId, dto),
    onSuccess: () => invalidateLoanViews(queryClient),
  });
}

export function useDisableLoanPayment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: disableLoanPayment, onSuccess: () => invalidateLoanViews(queryClient) });
}
