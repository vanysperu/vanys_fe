import { apiClient } from '@/config/apiClient';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CorrectPurchaseDto,
  CorrectPurchaseResult,
  PurchaseDetail,
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemPurchaseDto,
  PurchaseOrder,
  PurchaseOrderItemPurchase,
  PurchaseOrderItemStatus,
  PurchaseOrderListParams,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';

export async function getPurchaseOrders(params: PurchaseOrderListParams): Promise<PagedListResult<PurchaseOrder>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<PurchaseOrder>>>('/purchase-order/list', {
    params,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createPurchaseOrder(dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
  const response = await apiClient.post<ApiResponse<PurchaseOrder>>('/purchase-order/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updatePurchaseOrderItemStatus(itemId: number, status: PurchaseOrderItemStatus): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/purchase-order/item/${itemId}/status`, { status });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getPurchase(id: number): Promise<PurchaseDetail> {
  const response = await apiClient.get<ApiResponse<PurchaseDetail>>(`/purchase-order/purchase/find/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function correctPurchase(id: number, dto: CorrectPurchaseDto): Promise<CorrectPurchaseResult> {
  const response = await apiClient.put<ApiResponse<CorrectPurchaseResult>>(
    `/purchase-order/purchase/update/${id}`,
    dto,
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Anula una compra (de una sola vía: no se restaura).
export async function annulPurchase({ id, reason }: ReasonedToggleInput): Promise<{ id: number }> {
  const response = await apiClient.put<ApiResponse<{ id: number }>>(`/purchase-order/purchase/disable/${id}`, reason ? { reason } : undefined);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// URL del historial de correcciones de una compra (para CorrectionHistoryDialog).
export const purchaseCorrectionsUrl = (id: number) => `/purchase-order/purchase/${id}/corrections`;

export async function createPurchaseOrderItemPurchase(
  itemId: number,
  dto: CreatePurchaseOrderItemPurchaseDto,
): Promise<PurchaseOrderItemPurchase & { invoice_id?: number | null }> {
  // invoice_id: la factura registrada si la compra la llevaba.
  const response = await apiClient.post<ApiResponse<PurchaseOrderItemPurchase & { invoice_id?: number | null }>>(
    `/purchase-order/item/${itemId}/purchases`,
    dto,
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}
