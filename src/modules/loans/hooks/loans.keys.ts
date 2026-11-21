import type { LoanListParams } from '@/modules/loans/types/loan.types';

export const loansKeys = {
  all: ['loans'] as const,
  lists: () => [...loansKeys.all, 'list'] as const,
  list: (params: LoanListParams) => [...loansKeys.lists(), params] as const,
  detail: (id: number) => [...loansKeys.all, 'detail', id] as const,
};
