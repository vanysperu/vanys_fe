import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/modules/inventory/api/inventory.api';
import { productsKeys } from '@/modules/products/hooks/products.keys';
import type { DocumentListParams } from '@/modules/inventory/types/inventory.types';

// Query keys del inventario (CLAUDE.md §7: un objeto por módulo).
export const inventoryKeys = {
  all: ['inventory'] as const,
  warehouses: (params: object) => [...inventoryKeys.all, 'warehouses', params] as const,
  stores: (params: object) => [...inventoryKeys.all, 'stores', params] as const,
  // Todo lo que depende del stock: se refresca al mover stock.
  stockData: () => [...inventoryKeys.all, 'stock-data'] as const,
  stock: (params: object) => [...inventoryKeys.stockData(), 'stock', params] as const,
  ownStock: (productIds: number[], companyId: number | undefined) =>
    [...inventoryKeys.stockData(), 'own', companyId ?? 'own', [...productIds].sort((a, b) => a - b).join(',')] as const,
  kardex: (params: object) => [...inventoryKeys.stockData(), 'kardex', params] as const,
  lots: (params: object) => [...inventoryKeys.stockData(), 'lots', params] as const,
  documents: () => [...inventoryKeys.all, 'documents'] as const,
  documentList: (params: DocumentListParams) => [...inventoryKeys.documents(), 'list', params] as const,
  document: (id: number) => [...inventoryKeys.documents(), 'detail', id] as const,
};

export function useWarehouses(params: { page: number; limit: number; onlyActive?: boolean; companyId?: number }, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: inventoryKeys.warehouses(params),
    queryFn: () => api.getWarehouses(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useStores(params: { page: number; limit: number; companyId?: number }, options?: { enabled?: boolean }) {
  return useQuery({ queryKey: inventoryKeys.stores(params), queryFn: () => api.getStores(params), enabled: options?.enabled });
}

export function useStock(params: { page: number; limit: number; warehouseId?: number; searchTerm?: string; companyId?: number }) {
  return useQuery({ queryKey: inventoryKeys.stock(params), queryFn: () => api.getStock(params), placeholderData: keepPreviousData });
}

// Stock propio de los productos de una cotización, en una sola llamada.
export function useOwnStock(productIds: number[], options: { enabled: boolean; companyId?: number }) {
  return useQuery({
    queryKey: inventoryKeys.ownStock(productIds, options.companyId),
    queryFn: () => api.getOwnStock(productIds, options.companyId),
    enabled: options.enabled && productIds.length > 0,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
    retry: false,
  });
}

export function useKardex(params: Parameters<typeof api.getKardex>[0], options: { enabled: boolean }) {
  return useQuery({ queryKey: inventoryKeys.kardex(params), queryFn: () => api.getKardex(params), enabled: options.enabled, placeholderData: keepPreviousData });
}

export function useSuggestedLots(params: { warehouseId: number; productId: number; color?: string }, options: { enabled: boolean }) {
  return useQuery({ queryKey: inventoryKeys.lots(params), queryFn: () => api.suggestLots(params), enabled: options.enabled });
}

export function useStockDocuments(params: DocumentListParams) {
  return useQuery({ queryKey: inventoryKeys.documentList(params), queryFn: () => api.getDocuments(params), placeholderData: keepPreviousData });
}

export function useStockDocument(id: number | null) {
  return useQuery({ queryKey: inventoryKeys.document(id ?? 0), queryFn: () => api.getDocument(id ?? 0), enabled: Boolean(id) });
}

const useInvalidate = (keys: (readonly unknown[])[]) => {
  const queryClient = useQueryClient();
  return () => keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
};

const WAREHOUSE_KEYS = [[...inventoryKeys.all, 'warehouses']];
const MOVEMENT_KEYS = [inventoryKeys.documents(), inventoryKeys.stockData()];

export const useCreateWarehouse = () => useMutation({ mutationFn: api.createWarehouse, onSuccess: useInvalidate(WAREHOUSE_KEYS) });
export const useUpdateWarehouse = () => useMutation({ mutationFn: api.updateWarehouse, onSuccess: useInvalidate(WAREHOUSE_KEYS) });
export const useToggleWarehouse = () => useMutation({ mutationFn: api.toggleWarehouse, onSuccess: useInvalidate(WAREHOUSE_KEYS) });
export const useUpdateStore = () => useMutation({ mutationFn: api.updateStore, onSuccess: useInvalidate([[...inventoryKeys.all, 'stores']]) });
export const useSetTracksStock = () => useMutation({ mutationFn: api.setTracksStock, onSuccess: useInvalidate([productsKeys.all]) });
export const useCreateDocument = () => useMutation({ mutationFn: api.createDocument, onSuccess: useInvalidate([inventoryKeys.documents()]) });
export const useUpdateDocument = () => useMutation({ mutationFn: api.updateDocument, onSuccess: useInvalidate([inventoryKeys.documents()]) });
export const usePostDocument = () => useMutation({ mutationFn: api.postDocument, onSuccess: useInvalidate(MOVEMENT_KEYS) });
export const useCancelDocument = () => useMutation({ mutationFn: api.cancelDocument, onSuccess: useInvalidate(MOVEMENT_KEYS) });
export const useDispatchTransfer = () => useMutation({ mutationFn: api.dispatchTransfer, onSuccess: useInvalidate(MOVEMENT_KEYS) });
export const useReceiveTransfer = () => useMutation({ mutationFn: api.receiveTransfer, onSuccess: useInvalidate(MOVEMENT_KEYS) });
