import type { CashMovementListParams, MonthSummaryParams } from '@/modules/cashMovements/types/cashMovement.types';

export const cashMovementsKeys = {
  all: ['cash-movements'] as const,
  lists: () => [...cashMovementsKeys.all, 'list'] as const,
  list: (params: CashMovementListParams) => [...cashMovementsKeys.lists(), params] as const,
  // Cuelga de all: todo lo que mueve dinero (y ya invalida all) lo refresca.
  monthSummary: (params: MonthSummaryParams) => [...cashMovementsKeys.all, 'month-summary', params] as const,
};
