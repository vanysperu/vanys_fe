import type { SupplierListParams } from '@/modules/suppliers/types/supplier.types';

export const suppliersKeys = {
  all: ['suppliers'] as const,
  lists: () => [...suppliersKeys.all, 'list'] as const,
  list: (params: SupplierListParams) => [...suppliersKeys.lists(), params] as const,
};
