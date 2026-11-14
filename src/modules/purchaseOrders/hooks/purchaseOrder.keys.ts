import type { PurchaseOrderListParams } from '@/modules/purchaseOrders/types/purchaseOrder.types';

export const purchaseOrderKeys = {
  all: ['purchaseOrders'] as const,
  lists: () => [...purchaseOrderKeys.all, 'list'] as const,
  list: (params: PurchaseOrderListParams) => [...purchaseOrderKeys.lists(), params] as const,
  // Una compra suelta (diálogo de corrección).
  purchase: (id: number) => [...purchaseOrderKeys.all, 'purchase', id] as const,
  // Almacenes a los que puede ingresar la compra de un item.
  warehouseOptions: (itemId: number) => [...purchaseOrderKeys.all, 'warehouse-options', itemId] as const,
};
