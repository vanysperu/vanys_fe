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
