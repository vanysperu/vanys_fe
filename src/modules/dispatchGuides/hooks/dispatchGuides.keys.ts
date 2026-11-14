import type { CatalogListParams, GuideListParams } from '@/modules/dispatchGuides/types/dispatchGuide.types';

// Query keys de las guías de remisión (CLAUDE.md §7: un objeto por módulo).
export const dispatchGuidesKeys = {
  all: ['dispatchGuides'] as const,
  lists: () => [...dispatchGuidesKeys.all, 'list'] as const,
  list: (params: GuideListParams) => [...dispatchGuidesKeys.lists(), params] as const,
  detail: (id: number) => [...dispatchGuidesKeys.all, 'detail', id] as const,
  // La precarga depende de lo ya despachado: cuelga de lists() para refrescarse con cada guía.
  prefill: (source: { quotationId?: number; transferId?: number }) => [...dispatchGuidesKeys.lists(), 'prefill', source] as const,
  pdf: (id: number) => [...dispatchGuidesKeys.all, 'pdf', id] as const,
  carriers: (searchTerm: string, companyId?: number) => [...dispatchGuidesKeys.all, 'carriers', searchTerm, companyId] as const,
  vehicles: () => [...dispatchGuidesKeys.all, 'vehicles'] as const,
  vehicleList: (params: CatalogListParams) => [...dispatchGuidesKeys.vehicles(), params] as const,
  drivers: () => [...dispatchGuidesKeys.all, 'drivers'] as const,
  driverList: (params: CatalogListParams) => [...dispatchGuidesKeys.drivers(), params] as const,
};
