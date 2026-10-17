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

export function usePurchaseOrders(params: PurchaseOrderListParams) {
  return useQuery({
    queryKey: purchaseOrderKeys.list(params),
    queryFn: () => getPurchaseOrders(params),
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
// actualice sin que el usuario tenga que refrescar a mano.
export function useCreatePurchaseOrderItemPurchase(quotationId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, dto }: { itemId: number; dto: CreatePurchaseOrderItemPurchaseDto }) =>
      createPurchaseOrderItemPurchase(itemId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.lists() });
      if (quotationId) queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}
