import type { StockSearchParams, StockSourceListParams } from '@/modules/supplierStock/types/supplierStock.types';

export const supplierStockKeys = {
  all: ['supplierStock'] as const,
  sources: () => [...supplierStockKeys.all, 'sources'] as const,
  sourceList: (params: StockSourceListParams) => [...supplierStockKeys.sources(), 'list', params] as const,
  imports: (sourceId: number, page: number) => [...supplierStockKeys.sources(), 'imports', sourceId, page] as const,
  // Datos leídos de los Excel: se refrescan al actualizar una fuente.
  data: () => [...supplierStockKeys.all, 'data'] as const,
  search: (params: StockSearchParams) => [...supplierStockKeys.data(), 'search', params] as const,
  // Ids ordenados: el mismo conjunto de productos usa la misma caché.
  lookup: (productIds: number[], companyId: number | undefined) =>
    [...supplierStockKeys.data(), 'lookup', companyId ?? 'own', [...productIds].sort((a, b) => a - b).join(',')] as const,
};
