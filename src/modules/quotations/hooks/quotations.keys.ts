import type { QuotationBoardParams, QuotationListParams, QuotationStatus } from '@/modules/quotations/types/quotation.types';

export const quotationsKeys = {
  all: ['quotations'] as const,
  lists: () => [...quotationsKeys.all, 'list'] as const,
  list: (params: QuotationListParams) => [...quotationsKeys.lists(), params] as const,
  // Cuelgan de lists(): todo lo que invalida los listados (cambiar de estado,
  // crear, editar...) refresca también el tablero y sus "Ver más".
  board: (params: QuotationBoardParams) => [...quotationsKeys.lists(), 'board', params] as const,
  boardColumn: (status: QuotationStatus, params: QuotationBoardParams) =>
    [...quotationsKeys.lists(), 'board-column', status, params] as const,
  detail: (id: number) => [...quotationsKeys.all, 'detail', id] as const,
  // Cuelga del detalle: todo lo que invalida el detalle (cambio de estado,
  // pagos...) invalida también la vista previa del PDF ya generada.
  pdf: (id: number) => [...quotationsKeys.detail(id), 'pdf'] as const,
  // Un gasto suelto (diálogo de corrección).
  expense: (id: number) => [...quotationsKeys.all, 'expense', id] as const,
};
