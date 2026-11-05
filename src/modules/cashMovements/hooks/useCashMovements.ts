import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMonthSummary,
  createCashMovement,
  getCashMovements,
  toggleCashMovementStatus,
  updateCashMovement,
} from '@/modules/cashMovements/api/cashMovements.api';
import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import type { CashMovementListParams, MonthSummaryParams, UpdateCashMovementDto } from '@/modules/cashMovements/types/cashMovement.types';

export function useCashMovements(params: CashMovementListParams) {
  return useQuery({
    queryKey: cashMovementsKeys.list(params),
    queryFn: () => getCashMovements(params),
    placeholderData: keepPreviousData,
  });
}

// Crear o anular un movimiento manual cambia los totales de Caja y los de
// Estadísticas (suman en vivo desde la misma tabla).
export function useCreateCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCashMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
    },
  });
}

export function useToggleCashMovementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleCashMovementStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
    },
  });
}

// Corregir un movimiento manual: cambia los totales de Caja y Estadísticas y
// suma una fila al historial de ese movimiento — se invalidan solo esas keys.
export function useUpdateCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCashMovementDto }) => updateCashMovement(id, dto),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('manual', id) });
      queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
    },
  });
}

// Resumen del mes de Caja (resultado, IGV y neto).
export function useMonthSummary(params: MonthSummaryParams, enabled = true) {
  return useQuery({
    queryKey: cashMovementsKeys.monthSummary(params),
    queryFn: () => getMonthSummary(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}
