import type { QuotationListParams } from '@/modules/quotations/types/quotation.types';

export const quotationsKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationsKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationsKeys.lists(), params] as const,
  detail: (id: number) => [...quotationsKeys.all, 'detail', id] as const,
};
