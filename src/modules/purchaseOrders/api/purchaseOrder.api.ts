import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
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

export async function createPurchaseOrderItemPurchase(
  itemId: number,
  dto: CreatePurchaseOrderItemPurchaseDto,
): Promise<PurchaseOrderItemPurchase> {
  const response = await apiClient.post<ApiResponse<PurchaseOrderItemPurchase>>(
    `/purchase-order/item/${itemId}/purchases`,
    dto,
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}
