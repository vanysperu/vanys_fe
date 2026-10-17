import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CashMovementListParams,
  CashMovementListResult,
  CreateCashMovementDto,
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

export async function toggleCashMovementStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/cash-movement/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
