import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type { Client, ClientListParams, CreateClientDto, UpdateClientDto } from '@/modules/clients/types/client.types';

export async function getClients(params: ClientListParams): Promise<PagedListResult<Client>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<Client>>>('/client/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createClient(dto: CreateClientDto): Promise<Client> {
  const response = await apiClient.post<ApiResponse<Client>>('/client/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateClient(id: number, dto: UpdateClientDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/client/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleClientStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/client/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
