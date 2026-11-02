import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import { keepPreviousData, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import {
  annulPurchase,
  correctPurchase,
  getPurchase,
  createPurchaseOrder,
  createPurchaseOrderItemPurchase,
  getPurchaseOrders,
  updatePurchaseOrderItemStatus,
} from '@/modules/purchaseOrders/api/purchaseOrder.api';
import { purchaseOrderKeys } from '@/modules/purchaseOrders/hooks/purchaseOrder.keys';
import type {
  CorrectPurchaseDto,
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

// Corregir o anular una compra mueve su gasto (cotización, Caja,
// Estadísticas), su deuda con el trabajador y el estado del item/orden.
function invalidateAfterPurchaseChange(queryClient: QueryClient, quotationExpenseId?: number) {
  queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
  queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.all });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  queryClient.invalidateQueries({ queryKey: employeeDebtsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
  if (quotationExpenseId !== undefined) {
    queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('quotation_expense', quotationExpenseId) });
  }
}

export function usePurchase(id: number) {
  return useQuery({
    queryKey: purchaseOrderKeys.purchase(id),
    queryFn: () => getPurchase(id),
    // Siempre lo vigente al abrir el diálogo de corrección.
    staleTime: 0,
  });
}

export function useCorrectPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CorrectPurchaseDto }) => correctPurchase(id, dto),
    onSuccess: (data) => invalidateAfterPurchaseChange(queryClient, data.quotation_expense_id),
  });
}

export function useAnnulPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReasonedToggleInput) => annulPurchase(input),
    onSuccess: () => invalidateAfterPurchaseChange(queryClient),
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
      // Una compra pagada por la empresa mueve caja: Estadísticas y cierres también.
      queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
      queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
      if (quotationId) queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}
