import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type { CatalogListParams, CreateProductDto, Product, UpdateProductDto } from '@/modules/products/types/product.types';

export async function getProducts(params: CatalogListParams): Promise<PagedListResult<Product>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<Product>>>('/product/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createProduct(dto: CreateProductDto): Promise<Product> {
  const response = await apiClient.post<ApiResponse<Product>>('/product/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateProduct(id: number, dto: UpdateProductDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/product/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleProductStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/product/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Sube la foto de un producto (se guarda en la base, como los logos) y
// devuelve su ruta; se asigna al producto recién al guardar el formulario.
// Sin Content-Type manual: axios arma el boundary del FormData.
export async function uploadProductImage({ file, companyId }: { file: File; companyId?: number }): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (companyId) formData.append('company_id', String(companyId));
  const response = await apiClient.post<ApiResponse<{ path: string }>>('/product/image', formData);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
