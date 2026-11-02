import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CashMovementListParams,
  CashMovementListResult,
  CreateCashMovementDto,
  UpdateCashMovementDto,
} from '@/modules/cashMovements/types/cashMovement.types';

export async function getCashMovements(params: CashMovementListParams): Promise<CashMovementListResult> {
  const response = await apiClient.get<ApiResponse<CashMovementListResult>>('/cash-movement/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createCashMovement(dto: CreateCashMovementDto): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>('/cash-movement/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// reason: solo cuando el movimiento es de un mes cerrado (se registra como ajuste).
export async function toggleCashMovementStatus({ id, reason }: { id: number; reason?: string }): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/cash-movement/disable/${id}`, reason ? { reason } : undefined);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateCashMovement(id: number, dto: UpdateCashMovementDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/cash-movement/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
