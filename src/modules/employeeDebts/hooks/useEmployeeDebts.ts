import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  cancelManualEmployeeDebt,
  correctEmployeeDebtPayment,
  correctManualEmployeeDebt,
  getEmployeeDebtById,
  getEmployeeDebtPaymentById,
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
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';

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
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
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
  return useMutation({ mutationFn: (input: ReasonedToggleInput) => voidEmployeeDebtPayment(input), onSuccess: () => invalidateDebtMoney(queryClient) });
}

// --- Correcciones -------------------------------------------------------

// Datos actuales de la fila, recién pedidos (staleTime 0): se corrige sobre
// lo que hay hoy en la base, no sobre una lista vieja en cache.
export function useEmployeeDebtRecord(debtId: number) {
  return useQuery({
    queryKey: employeeDebtsKeys.record(debtId),
    queryFn: () => getEmployeeDebtById(debtId),
    staleTime: 0,
    retry: false,
  });
}

export function useEmployeeDebtPaymentRecord(paymentId: number) {
  return useQuery({
    queryKey: employeeDebtsKeys.paymentRecord(paymentId),
    queryFn: () => getEmployeeDebtPaymentById(paymentId),
    staleTime: 0,
    retry: false,
  });
}

// Corregir mueve lo pendiente de las deudas, Caja (reposiciones: monto,
// fecha y cuenta) y Estadísticas; además suma una fila al historial.
export function useCorrectManualEmployeeDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: correctManualEmployeeDebt,
    onSuccess: (_data, { id }) => {
      invalidateDebtMoney(queryClient);
      queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('employee_debt', id) });
    },
  });
}

export function useCorrectEmployeeDebtPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: correctEmployeeDebtPayment,
    onSuccess: (_data, { id }) => {
      invalidateDebtMoney(queryClient);
      queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('employee_debt_payment', id) });
    },
  });
}
