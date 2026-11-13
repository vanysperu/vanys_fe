import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  DocumentListParams,
  KardexResult,
  OwnStockLookup,
  SaveDocumentDto,
  SaveWarehouseDto,
  StockDocument,
  StockRow,
  StoreSettings,
  SuggestedLot,
  Warehouse,
  ExitOn,
} from '@/modules/inventory/types/inventory.types';

const unwrap = <T,>(response: { data: ApiResponse<T> }): T => {
  if (!response.data.success) throw response.data;
  return response.data.data;
};

export const getWarehouses = async (params: { page: number; limit: number; onlyActive?: boolean; companyId?: number }) =>
  unwrap(await apiClient.get<ApiResponse<PagedListResult<Warehouse>>>('/inventory/warehouses', { params }));

export const createWarehouse = async (dto: SaveWarehouseDto) =>
  unwrap(await apiClient.post<ApiResponse<Warehouse>>('/inventory/warehouses', dto));

export const updateWarehouse = async ({ id, dto }: { id: number; dto: SaveWarehouseDto }) =>
  unwrap(await apiClient.put<ApiResponse<Warehouse>>(`/inventory/warehouses/${id}`, dto));

export const toggleWarehouse = async (id: number) =>
  unwrap(await apiClient.put<ApiResponse<Warehouse>>(`/inventory/warehouses/${id}/disable`));

export const getStores = async (params: { page: number; limit: number; companyId?: number }) =>
  unwrap(await apiClient.get<ApiResponse<PagedListResult<StoreSettings>>>('/inventory/stores', { params }));

export const updateStore = async ({ id, inventory_enabled, inventory_exit_on }: { id: number; inventory_enabled: boolean; inventory_exit_on: ExitOn }) =>
  unwrap(await apiClient.put<ApiResponse<StoreSettings>>(`/inventory/stores/${id}`, { inventory_enabled, inventory_exit_on }));

export const setTracksStock = async (dto: { all?: boolean; productIds?: number[]; tracksStock: boolean; company_id?: number }) =>
  unwrap(await apiClient.put<ApiResponse<{ updated: number }>>('/inventory/products/tracks-stock', dto));

export const getStock = async (params: { page: number; limit: number; warehouseId?: number; searchTerm?: string; companyId?: number }) =>
  unwrap(await apiClient.get<ApiResponse<PagedListResult<StockRow>>>('/inventory/stock', { params }));

export const getOwnStock = async (productIds: number[], companyId?: number) =>
  unwrap(
    await apiClient.get<ApiResponse<OwnStockLookup[]>>('/inventory/stock/by-products', {
      params: { productIds: productIds.join(','), companyId },
    }),
  );

export const getKardex = async (params: {
  productId: number;
  color?: string;
  warehouseId?: number;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
  companyId?: number;
}) => unwrap(await apiClient.get<ApiResponse<KardexResult>>('/inventory/kardex', { params }));

export const suggestLots = async (params: { warehouseId: number; productId: number; color?: string }) =>
  unwrap(await apiClient.get<ApiResponse<SuggestedLot[]>>('/inventory/lots/suggest', { params }));

export const getDocuments = async (params: DocumentListParams) =>
  unwrap(await apiClient.get<ApiResponse<PagedListResult<StockDocument>>>('/inventory/documents', { params }));

export const getDocument = async (id: number) => unwrap(await apiClient.get<ApiResponse<StockDocument>>(`/inventory/documents/${id}`));

export const createDocument = async (dto: SaveDocumentDto) =>
  unwrap(await apiClient.post<ApiResponse<StockDocument>>('/inventory/documents', dto));

export const updateDocument = async ({ id, dto }: { id: number; dto: SaveDocumentDto }) =>
  unwrap(await apiClient.put<ApiResponse<StockDocument>>(`/inventory/documents/${id}`, dto));

export const postDocument = async (id: number) =>
  unwrap(await apiClient.post<ApiResponse<StockDocument>>(`/inventory/documents/${id}/post`));

export const cancelDocument = async ({ id, reason }: { id: number; reason: string }) =>
  unwrap(await apiClient.post<ApiResponse<StockDocument>>(`/inventory/documents/${id}/cancel`, { reason }));

export const dispatchTransfer = async (id: number) =>
  unwrap(await apiClient.post<ApiResponse<StockDocument>>(`/inventory/documents/${id}/dispatch`));

export const receiveTransfer = async ({
  id,
  lines,
  closeDifference,
}: {
  id: number;
  lines: { line_id: number; quantity: number }[];
  closeDifference: boolean;
}) => unwrap(await apiClient.post<ApiResponse<StockDocument>>(`/inventory/documents/${id}/receive`, { lines, closeDifference }));
