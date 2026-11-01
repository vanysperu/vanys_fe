import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  cancelManualEmployeeDebt,
  createManualEmployeeDebt,
  getEmployeeDebtDetail,
  getEmployeeDebtPayments,
  getEmployeeDebts,
  payEmployeeDebt,
  voidEmployeeDebtPayment,
} from '@/modules/employeeDebts/api/employeeDebts.api';
import { employeeDebtsKeys } from '@/modules/employeeDebts/hooks/employeeDebts.keys';
import type {
  EmployeeDebtDetailParams,
  EmployeeDebtListParams,
  EmployeeDebtPaymentListParams,
} from '@/modules/employeeDebts/types/employeeDebt.types';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';

export function useEmployeeDebts(params: EmployeeDebtListParams) {
  return useQuery({
    queryKey: employeeDebtsKeys.list(params),
    queryFn: () => getEmployeeDebts(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeDebtDetail(params: EmployeeDebtDetailParams) {
  return useQuery({
    queryKey: employeeDebtsKeys.detail(params),
    queryFn: () => getEmployeeDebtDetail(params),
    placeholderData: keepPreviousData,
  });
}

export function useEmployeeDebtPayments(params: EmployeeDebtPaymentListParams) {
  return useQuery({
    queryKey: employeeDebtsKeys.paymentList(params),
    queryFn: () => getEmployeeDebtPayments(params),
    placeholderData: keepPreviousData,
  });
}

// Todo lo que cambia una deuda o una reposición cambia también Caja (los
// gastos pagados por trabajadores y sus reposiciones) y el flujo de caja de
// Estadísticas.
const invalidateDebtMoney = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: employeeDebtsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
};

export function usePayEmployeeDebt() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: payEmployeeDebt, onSuccess: () => invalidateDebtMoney(queryClient) });
}

export function useCreateManualEmployeeDebt() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: createManualEmployeeDebt, onSuccess: () => invalidateDebtMoney(queryClient) });
}

export function useCancelManualEmployeeDebt() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: cancelManualEmployeeDebt, onSuccess: () => invalidateDebtMoney(queryClient) });
}

export function useVoidEmployeeDebtPayment() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: voidEmployeeDebtPayment, onSuccess: () => invalidateDebtMoney(queryClient) });
}
