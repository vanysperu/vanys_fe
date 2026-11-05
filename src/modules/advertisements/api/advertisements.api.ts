import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  Advertisement,
  AdvertisementListParams,
  CreateAdvertisementDto,
  UpdateAdvertisementDto,
} from '@/modules/advertisements/types/advertisement.types';

export async function getAdvertisements(params: AdvertisementListParams): Promise<PagedListResult<Advertisement>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<Advertisement>>>('/advertisement/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createAdvertisement(dto: CreateAdvertisementDto): Promise<Advertisement> {
  const response = await apiClient.post<ApiResponse<Advertisement>>('/advertisement/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateAdvertisement(id: number, dto: UpdateAdvertisementDto): Promise<Advertisement> {
  const response = await apiClient.put<ApiResponse<Advertisement>>(`/advertisement/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Posición dentro de su zona (1 = primero en la web).
export async function moveAdvertisement(id: number, position: number): Promise<Advertisement> {
  const response = await apiClient.put<ApiResponse<Advertisement>>(`/advertisement/position/${id}`, { position });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Se manda el estado final (prendido/apagado), no "invertir".
export async function setAdvertisementActive(id: number, isActive: boolean): Promise<Advertisement> {
  const response = await apiClient.put<ApiResponse<Advertisement>>(`/advertisement/disable/${id}`, { is_active: isActive });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Borrado DEFINITIVO, con su imagen.
export async function deleteAdvertisement(id: number): Promise<{ id: number; title: string }> {
  const response = await apiClient.delete<ApiResponse<{ id: number; title: string }>>(`/advertisement/delete/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function uploadAdvertisementImage({ file, companyId }: { file: File; companyId?: number }): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (companyId) formData.append('company_id', String(companyId));
  const response = await apiClient.post<ApiResponse<{ path: string }>>('/advertisement/image', formData);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
