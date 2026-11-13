import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type { SaveSupplierDto, Supplier, SupplierListParams } from '@/modules/suppliers/types/supplier.types';

export async function getSuppliers(params: SupplierListParams): Promise<PagedListResult<Supplier>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<Supplier>>>('/supplier/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createSupplier(dto: SaveSupplierDto): Promise<Supplier> {
  const response = await apiClient.post<ApiResponse<Supplier>>('/supplier/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateSupplier(id: number, dto: SaveSupplierDto): Promise<Supplier> {
  const response = await apiClient.put<ApiResponse<Supplier>>(`/supplier/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleSupplierStatus(id: number): Promise<Supplier> {
  const response = await apiClient.put<ApiResponse<Supplier>>(`/supplier/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
