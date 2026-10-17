import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  Company,
  CompanyListParams,
  CreateCompanyDto,
  Theme,
  UpdateCompanyDto,
} from '@/modules/platform/types/platform.types';

export async function getCompanies(params: CompanyListParams): Promise<PagedListResult<Company>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<Company>>>('/company/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createCompany(dto: CreateCompanyDto): Promise<Company> {
  const response = await apiClient.post<ApiResponse<Company>>('/company/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateCompany(id: number, dto: UpdateCompanyDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/company/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleCompanyStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/company/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getThemes(): Promise<Theme[]> {
  const response = await apiClient.get<ApiResponse<Theme[]>>('/theme/list');
  if (!response.data.success) throw response.data;
  return response.data.data;
}
