import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import {
  closeCashPeriod,
  getCashBalances,
  getCashClosings,
  getCashOpening,
  getCashPeriodAdjustments,
  getCashPeriodDetail,
  getCashPeriodEvents,
  getCashPeriodStatus,
  reopenCashPeriod,
  setCashOpening,
} from '@/modules/cashClosings/api/cashClosings.api';
import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import type {
  CashClosingsListParams,
  CashPeriodAdjustmentsParams,
  CashPeriodEventsParams,
  ClosePeriodDto,
  ReopenPeriodDto,
  SetCashOpeningDto,
} from '@/modules/cashClosings/types/cashClosings.types';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { employeeDebtsKeys } from '@/modules/employeeDebts/hooks/employeeDebts.keys';
import { paymentsKeys } from '@/modules/payments/hooks/payments.keys';
import { purchaseOrderKeys } from '@/modules/purchaseOrders/hooks/purchaseOrder.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import { receivablesKeys } from '@/modules/receivables/hooks/receivables.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';

// Estado de los meses de la empresa (cuáles están cerrados). Lo usan los
// formularios para bloquear fechas y las filas de Caja para el candado. Lo
// pueden pedir todos los roles. Un Super Administrador debe pasar la empresa;
// sin ella no se pide (el backend exigiría elegir una).
export function useCashPeriodStatus(companyId?: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cashClosingsKeys.status(companyId),
    queryFn: () => getCashPeriodStatus({ companyId }),
    staleTime: 5 * 60 * 1000,
    retry: false,
    enabled: options.enabled ?? true,
  });
}

export function useCashClosings(params: CashClosingsListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cashClosingsKeys.list(params),
    queryFn: () => getCashClosings(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useCashPeriodDetail(period: string | undefined, companyId?: number) {
  return useQuery({
    queryKey: cashClosingsKeys.detail(period ?? '', companyId),
    queryFn: () => getCashPeriodDetail(period ?? '', { companyId }),
    enabled: Boolean(period),
    placeholderData: keepPreviousData,
  });
}

export function useCashPeriodAdjustments(params: CashPeriodAdjustmentsParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cashClosingsKeys.adjustments(params),
    queryFn: () => getCashPeriodAdjustments(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

export function useCashPeriodEvents(params: CashPeriodEventsParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cashClosingsKeys.events(params),
    queryFn: () => getCashPeriodEvents(params),
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  });
}

// Saldos actuales por cuenta (panel de Caja). `enabled` lo apaga cuando el
// rol no tiene el botón `cash_closing.balances.button`.
export function useCashBalances(companyId?: number, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: cashClosingsKeys.balances(companyId),
    queryFn: () => getCashBalances({ companyId }),
    staleTime: 30 * 1000,
    retry: false,
    enabled: options.enabled ?? true,
  });
}

// startPeriod: el mes elegido en el selector "Mes de inicio" (undefined = guardado/sugerido).
// Al cambiar de mes se conservan los datos anteriores mientras llegan las
// pistas (el formulario no se desmonta), pero nunca los de OTRA empresa.
export function useCashOpening(companyId?: number, options: { enabled?: boolean; startPeriod?: string } = {}) {
  const { startPeriod } = options;
  return useQuery({
    queryKey: cashClosingsKeys.opening(companyId, startPeriod),
    queryFn: () => getCashOpening({ companyId, startPeriod }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === (companyId ?? null) ? previous : undefined,
    staleTime: 0,
    enabled: options.enabled ?? true,
  });
}

// Todo lo que depende del dinero de un mes: el cierre (saldos, ajustes,
// estado), Caja, Estadísticas y las pantallas que muestran lo cobrado/gastado.
// Se usa tras cerrar/reabrir y también tras cualquier corrección o anulación
// de dinero (que puede generar un ajuste y mover saldos).
export function invalidateCashClosingDependents(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
  queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
  queryClient.invalidateQueries({ queryKey: receivablesKeys.lists() });
  queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
  queryClient.invalidateQueries({ queryKey: employeeDebtsKeys.all });
}

export function useSetCashOpening() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SetCashOpeningDto) => setCashOpening(dto),
    onSuccess: () => invalidateCashClosingDependents(queryClient),
  });
}

export function useCloseCashPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ period, dto }: { period: string; dto: ClosePeriodDto }) => closeCashPeriod(period, dto),
    onSuccess: () => invalidateCashClosingDependents(queryClient),
  });
}

export function useReopenCashPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ period, dto }: { period: string; dto: ReopenPeriodDto }) => reopenCashPeriod(period, dto),
    onSuccess: () => invalidateCashClosingDependents(queryClient),
  });
}
