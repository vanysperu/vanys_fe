import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CatalogListParams,
  CreateTechniqueDto,
  CustomizationTechnique,
  UpdateTechniqueDto,
} from '@/modules/products/types/product.types';

export async function getTechniques(params: CatalogListParams): Promise<PagedListResult<CustomizationTechnique>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<CustomizationTechnique>>>(
    '/customization-technique/list',
    { params },
  );
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createTechnique(dto: CreateTechniqueDto): Promise<CustomizationTechnique> {
  const response = await apiClient.post<ApiResponse<CustomizationTechnique>>('/customization-technique/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateTechnique(id: number, dto: UpdateTechniqueDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/customization-technique/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleTechniqueStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/customization-technique/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
