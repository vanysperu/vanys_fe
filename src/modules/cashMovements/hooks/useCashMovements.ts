import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createCashMovement,
  getCashMovements,
  toggleCashMovementStatus,
} from '@/modules/cashMovements/api/cashMovements.api';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import type { CashMovementListParams } from '@/modules/cashMovements/types/cashMovement.types';

export function useCashMovements(params: CashMovementListParams) {
  return useQuery({
    queryKey: cashMovementsKeys.list(params),
    queryFn: () => getCashMovements(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCashMovement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() }),
  });
}

export function useToggleCashMovementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleCashMovementStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() }),
  });
}
