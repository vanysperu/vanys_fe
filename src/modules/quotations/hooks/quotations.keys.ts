import type { QuotationListParams } from '@/modules/quotations/types/quotation.types';

export const quotationsKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationsKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationsKeys.lists(), params] as const,
  detail: (id: number) => [...quotationsKeys.all, 'detail', id] as const,
  // Cuelga del detalle: todo lo que invalida el detalle (cambio de estado,
  // pagos...) invalida también la vista previa del PDF ya generada.
  pdf: (id: number) => [...quotationsKeys.detail(id), 'pdf'] as const,
};
