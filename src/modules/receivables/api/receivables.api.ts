import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { ReceivableListParams, ReceivableListResult } from '@/modules/receivables/types/receivable.types';

export async function getReceivables(params: ReceivableListParams): Promise<ReceivableListResult> {
  const response = await apiClient.get<ApiResponse<ReceivableListResult>>('/receivable/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
