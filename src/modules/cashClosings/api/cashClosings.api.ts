import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CashBalancesResponse,
  CashClosingListResult,
  CashClosingsCompanyParams,
  CashClosingsListParams,
  CashOpeningResponse,
  CashPeriodAdjustmentItem,
  CashPeriodAdjustmentsParams,
  CashPeriodDetail,
  CashPeriodEventItem,
  CashPeriodEventsParams,
  CashPeriodStatus,
  ClosePeriodDto,
  ReopenPeriodDto,
  SetCashOpeningDto,
} from '@/modules/cashClosings/types/cashClosings.types';

export async function getCashPeriodStatus(params: CashClosingsCompanyParams): Promise<CashPeriodStatus> {
  const response = await apiClient.get<ApiResponse<CashPeriodStatus>>('/cash-closing/status', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getCashClosings(params: CashClosingsListParams): Promise<CashClosingListResult> {
  const response = await apiClient.get<ApiResponse<CashClosingListResult>>('/cash-closing/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getCashPeriodDetail(period: string, params: CashClosingsCompanyParams): Promise<CashPeriodDetail> {
  const response = await apiClient.get<ApiResponse<CashPeriodDetail>>(`/cash-closing/find/${period}`, { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getCashPeriodAdjustments(
  params: CashPeriodAdjustmentsParams,
): Promise<PagedListResult<CashPeriodAdjustmentItem>> {
  const { period, ...query } = params;
  const response = await apiClient.get<ApiResponse<PagedListResult<CashPeriodAdjustmentItem>>>(
    `/cash-closing/${period}/adjustments`,
    { params: query },
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getCashPeriodEvents(params: CashPeriodEventsParams): Promise<PagedListResult<CashPeriodEventItem>> {
  const { period, ...query } = params;
  const response = await apiClient.get<ApiResponse<PagedListResult<CashPeriodEventItem>>>(
    `/cash-closing/${period}/events`,
    { params: query },
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getCashBalances(params: CashClosingsCompanyParams): Promise<CashBalancesResponse> {
  const response = await apiClient.get<ApiResponse<CashBalancesResponse>>('/cash-closing/balances', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// startPeriod: pide las pistas ("Según lo registrado antes de esa fecha") de otro
// mes de inicio; el backend lo ignora si el mes ya no se puede cambiar.
export async function getCashOpening(
  params: CashClosingsCompanyParams & { startPeriod?: string },
): Promise<CashOpeningResponse> {
  const response = await apiClient.get<ApiResponse<CashOpeningResponse>>('/cash-closing/opening', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function setCashOpening(dto: SetCashOpeningDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>('/cash-closing/opening', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function closeCashPeriod(period: string, dto: ClosePeriodDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/cash-closing/close/${period}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function reopenCashPeriod(period: string, dto: ReopenPeriodDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/cash-closing/reopen/${period}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
