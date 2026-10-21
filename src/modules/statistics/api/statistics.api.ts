import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { StatisticsOverview, StatisticsParams } from '@/modules/statistics/types/statistics.types';

export async function getStatisticsOverview(params: StatisticsParams): Promise<StatisticsOverview> {
  const response = await apiClient.get<ApiResponse<StatisticsOverview>>('/statistics/overview', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
