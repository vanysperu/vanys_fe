import { usePurchaseWarehouseOptions } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';

// Lo que eligió la persona. undefined en el padre = todavía no tocó nada: se usa
// el almacén sugerido por el backend (el predeterminado de la tienda).
export interface WarehouseChoice {
  warehouseId: number | null;
  lotCode: string;
  expiryDate: string;
}

// Elección efectiva: la de la persona o, si no tocó nada, la sugerida.
export function useWarehouseChoice(itemId: number, value: WarehouseChoice | undefined) {
  const { data: options } = usePurchaseWarehouseOptions(itemId);
  const choice: WarehouseChoice = value ?? { warehouseId: options?.suggested_warehouse_id ?? null, lotCode: '', expiryDate: '' };
  const warehouse = options?.warehouses.find((option) => option.id === choice.warehouseId) ?? null;
  return { options, choice: warehouse ? choice : { ...choice, warehouseId: null }, warehouse };
}
