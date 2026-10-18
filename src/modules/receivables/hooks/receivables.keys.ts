import type { ReceivableListParams } from '@/modules/receivables/types/receivable.types';

export const receivablesKeys = {
  all: ['receivables'] as const,
  lists: () => [...receivablesKeys.all, 'list'] as const,
  list: (params: ReceivableListParams) => [...receivablesKeys.lists(), params] as const,
};
