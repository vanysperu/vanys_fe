import type { CashMovementListParams } from '@/modules/cashMovements/types/cashMovement.types';

export const cashMovementsKeys = {
  all: ['cash-movements'] as const,
  lists: () => [...cashMovementsKeys.all, 'list'] as const,
  list: (params: CashMovementListParams) => [...cashMovementsKeys.lists(), params] as const,
};
