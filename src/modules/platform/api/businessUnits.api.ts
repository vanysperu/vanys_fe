import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  BusinessUnit,
  BusinessUnitListParams,
  CreateBusinessUnitDto,
  UpdateBusinessUnitDto,
} from '@/modules/platform/types/platform.types';

export async function getBusinessUnits(params: BusinessUnitListParams): Promise<PagedListResult<BusinessUnit>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<BusinessUnit>>>('/business-unit/list', {
    params,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createBusinessUnit(dto: CreateBusinessUnitDto): Promise<BusinessUnit> {
  const response = await apiClient.post<ApiResponse<BusinessUnit>>('/business-unit/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateBusinessUnit(id: number, dto: UpdateBusinessUnitDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/business-unit/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleBusinessUnitStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/business-unit/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
