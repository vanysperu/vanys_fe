import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  MonthSummary,
  MonthSummaryParams,
  CashMovementListParams,
  CashMovementListResult,
  CashTransferItem,
  CreateCashMovementDto,
  CreateCashTransferDto,
  UpdateCashMovementDto,
  UpdateCashTransferDto,
} from '@/modules/cashMovements/types/cashMovement.types';

// Resultado del mes, IGV estimado y neto después del IGV.
export async function getMonthSummary(params: MonthSummaryParams): Promise<MonthSummary> {
  const response = await apiClient.get<ApiResponse<MonthSummary>>('/cash-movement/month-summary', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

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

// Transferencias entre cuentas (se listan dentro de Caja, en getCashMovements).
export async function createCashTransfer(dto: CreateCashTransferDto): Promise<CashTransferItem> {
  const response = await apiClient.post<ApiResponse<CashTransferItem>>('/cash-movement/transfer/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateCashTransfer(id: number, dto: UpdateCashTransferDto): Promise<CashTransferItem> {
  const response = await apiClient.put<ApiResponse<CashTransferItem>>(`/cash-movement/transfer/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Anula (o reactiva, si ya estaba anulada).
export async function toggleCashTransferStatus(id: number): Promise<CashTransferItem> {
  const response = await apiClient.put<ApiResponse<CashTransferItem>>(`/cash-movement/transfer/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
