import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStockSource,
  getStockSourceImports,
  getStockSources,
  lookupProductStock,
  previewStockSource,
  refreshStockSource,
  searchSupplierStock,
  toggleStockSource,
  updateStockSource,
} from '@/modules/supplierStock/api/supplierStock.api';
import { supplierStockKeys } from '@/modules/supplierStock/hooks/supplierStock.keys';
import type { StockSearchParams, StockSourceListParams } from '@/modules/supplierStock/types/supplierStock.types';

// El stock cambia cuando se actualiza una fuente (cada pocas horas): no hace
// falta volver a pedirlo cada vez que se abre la cotización.
const STOCK_STALE_TIME_MS = 5 * 60 * 1000;

export function useStockSources(params: StockSourceListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierStockKeys.sourceList(params),
    queryFn: () => getStockSources(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useStockSourceImports(sourceId: number | null, page: number) {
  return useQuery({
    queryKey: supplierStockKeys.imports(sourceId ?? 0, page),
    queryFn: () => getStockSourceImports(sourceId ?? 0, page, 10),
    enabled: Boolean(sourceId),
  });
}

export function useStockSearch(params: StockSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: supplierStockKeys.search(params),
    queryFn: () => searchSupplierStock(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
    staleTime: STOCK_STALE_TIME_MS,
  });
}

// Una sola llamada para todos los productos de la cotización (CLAUDE.md §8).
export function useProductStockLookup(productIds: number[], options: { enabled: boolean; companyId?: number }) {
  return useQuery({
    queryKey: supplierStockKeys.lookup(productIds, options.companyId),
    queryFn: () => lookupProductStock(productIds, options.companyId),
    enabled: options.enabled && productIds.length > 0,
    staleTime: STOCK_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    // Sin la funcionalidad responde 403: no se reintenta, solo no se muestra.
    retry: false,
  });
}

const useInvalidateSources = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: supplierStockKeys.sources() });
};

export function useCreateStockSource() {
  const invalidate = useInvalidateSources();
  return useMutation({ mutationFn: createStockSource, onSuccess: invalidate });
}

export function useUpdateStockSource() {
  const invalidate = useInvalidateSources();
  return useMutation({ mutationFn: updateStockSource, onSuccess: invalidate });
}

export function useToggleStockSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleStockSource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierStockKeys.sources() });
      queryClient.invalidateQueries({ queryKey: supplierStockKeys.data() });
    },
  });
}

// Actualizar una fuente cambia su estado, su historial y el stock leído.
export function useRefreshStockSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshStockSource,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: supplierStockKeys.sources() });
      queryClient.invalidateQueries({ queryKey: supplierStockKeys.data() });
    },
  });
}

export function usePreviewStockSource() {
  return useMutation({ mutationFn: previewStockSource });
}
