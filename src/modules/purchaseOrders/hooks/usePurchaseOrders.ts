import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createPurchaseOrder,
  createPurchaseOrderItemPurchase,
  getPurchaseOrders,
  updatePurchaseOrderItemStatus,
} from '@/modules/purchaseOrders/api/purchaseOrder.api';
import { purchaseOrderKeys } from '@/modules/purchaseOrders/hooks/purchaseOrder.keys';
import type {
  CreatePurchaseOrderItemPurchaseDto,
  PurchaseOrderItemStatus,
  PurchaseOrderListParams,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { employeeDebtsKeys } from '@/modules/employeeDebts/hooks/employeeDebts.keys';

export function usePurchaseOrders(params: PurchaseOrderListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: () => getPurchaseOrders(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() }),
  });
}

export function useUpdatePurchaseOrderItemStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: PurchaseOrderItemStatus }) =>
      updatePurchaseOrderItemStatus(itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() }),
  });
}

// Registrar una compra genera un gasto real de la cotización — se
// invalidan también sus queries de detalle para que la pestaña "Gastos" se
// actualice sin que el usuario tenga que refrescar a mano. Si se pagó con
// plata del propio usuario queda una deuda con él, y si se pagó de caja un
// movimiento: esas listas también se invalidan (bug reportado: la deuda no
// aparecía hasta recargar la página).
export function useCreatePurchaseOrderItemPurchase(quotationId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, dto }: { itemId: number; dto: CreatePurchaseOrderItemPurchaseDto }) =>
      createPurchaseOrderItemPurchase(itemId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: employeeDebtsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
      if (quotationId) queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}
