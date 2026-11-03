import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  ApiKey,
  ApiKeyListParams,
  CreateApiKeyDto,
  CreatedApiKey,
  UpdateApiKeyDto,
} from '@/modules/apiKeys/types/apiKey.types';

export async function getApiKeys(params: ApiKeyListParams): Promise<PagedListResult<ApiKey>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<ApiKey>>>('/api-key/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createApiKey(dto: CreateApiKeyDto): Promise<CreatedApiKey> {
  const response = await apiClient.post<ApiResponse<CreatedApiKey>>('/api-key/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateApiKey(id: number, dto: UpdateApiKeyDto): Promise<ApiKey> {
  const response = await apiClient.put<ApiResponse<ApiKey>>(`/api-key/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function revokeApiKey(id: number): Promise<ApiKey> {
  const response = await apiClient.put<ApiResponse<ApiKey>>(`/api-key/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
