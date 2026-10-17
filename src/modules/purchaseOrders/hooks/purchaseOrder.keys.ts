import type { PurchaseOrderListParams } from '@/modules/purchaseOrders/types/purchaseOrder.types';

export const purchaseOrderKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...purchaseOrderKeys.all, 'list'] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.lists(), params] as const,
};
