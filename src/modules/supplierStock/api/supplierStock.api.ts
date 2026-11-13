import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  ProductStockLookup,
  SaveStockSourceDto,
  StockImport,
  StockPreview,
  StockPreviewInput,
  StockSearchParams,
  StockSearchRow,
  StockSource,
  StockSourceListParams,
} from '@/modules/supplierStock/types/supplierStock.types';

const unwrap = <T,>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) throw response.data;
  return response.data.data;
};

export async function getStockSources(params: StockSourceListParams): Promise<PagedListResult<StockSource>> {
  return unwrap(await apiClient.get<ApiResponse<PagedListResult<StockSource>>>('/supplier-stock/sources', { params }));
}

export async function createStockSource(dto: SaveStockSourceDto): Promise<StockSource> {
  return unwrap(await apiClient.post<ApiResponse<StockSource>>('/supplier-stock/sources', dto));
}

export async function updateStockSource({ id, dto }: { id: number; dto: SaveStockSourceDto }): Promise<StockSource> {
  return unwrap(await apiClient.put<ApiResponse<StockSource>>(`/supplier-stock/sources/${id}`, dto));
}

export async function toggleStockSource(id: number): Promise<StockSource> {
  return unwrap(await apiClient.put<ApiResponse<StockSource>>(`/supplier-stock/sources/${id}/disable`));
}

// "Actualizar ahora": sin archivo descarga el enlace; con archivo lo lee.
// Sin fijar Content-Type: axios arma el boundary del FormData.
export async function refreshStockSource({ id, file }: { id: number; file?: File | null }): Promise<StockSource> {
  if (!file) return unwrap(await apiClient.post<ApiResponse<StockSource>>(`/supplier-stock/sources/${id}/refresh`));
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(await apiClient.post<ApiResponse<StockSource>>(`/supplier-stock/sources/${id}/refresh`, formData));
}

export async function getStockSourceImports(id: number, page: number, limit: number): Promise<PagedListResult<StockImport>> {
  return unwrap(
    await apiClient.get<ApiResponse<PagedListResult<StockImport>>>(`/supplier-stock/sources/${id}/imports`, { params: { page, limit } }),
  );
}

// "Probar fuente": con archivo va en multipart (el mapeo como texto JSON).
export async function previewStockSource(input: StockPreviewInput): Promise<StockPreview> {
  const { file, ...rest } = input;
  if (!file) return unwrap(await apiClient.post<ApiResponse<StockPreview>>('/supplier-stock/preview', rest));

  const formData = new FormData();
  formData.append('file', file);
  formData.append('header_row', String(rest.header_row));
  if (rest.sheet_name) formData.append('sheet_name', rest.sheet_name);
  if (rest.column_map) formData.append('column_map', JSON.stringify(rest.column_map));
  return unwrap(await apiClient.post<ApiResponse<StockPreview>>('/supplier-stock/preview', formData));
}

export async function lookupProductStock(productIds: number[], companyId?: number): Promise<ProductStockLookup[]> {
  return unwrap(
    await apiClient.get<ApiResponse<ProductStockLookup[]>>('/supplier-stock/lookup', {
      params: { productIds: productIds.join(','), companyId },
    }),
  );
}

export async function searchSupplierStock(params: StockSearchParams): Promise<PagedListResult<StockSearchRow>> {
  return unwrap(await apiClient.get<ApiResponse<PagedListResult<StockSearchRow>>>('/supplier-stock/search', { params }));
}
