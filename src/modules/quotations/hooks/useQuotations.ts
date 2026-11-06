import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { statisticsKeys } from '@/modules/statistics/hooks/statistics.keys';
import {
  changeQuotationItemStage,
  changeQuotationStatus,
  completeQuotation,
  correctQuotationExpense,
  getQuotationExpense,
  toggleQuotationExpense,
  createQuotation,
  createQuotationExpense,
  createQuotationPayment,
  downloadQuotationPdf,
  getQuotation,
  getQuotationBoard,
  getQuotationProfit,
  getQuotations,
  updateQuotation,
} from '@/modules/quotations/api/quotations.api';
import { invoicesKeys } from '@/modules/invoices/hooks/invoices.keys';
import { paymentsKeys } from '@/modules/payments/hooks/payments.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import { receivablesKeys } from '@/modules/receivables/hooks/receivables.keys';
import type {
  CompleteQuotationDto,
  CorrectQuotationExpenseDto,
  CreateQuotationExpenseDto,
  CreateQuotationPaymentDto,
  QuotationBoardParams,
  QuotationListParams,
  QuotationStatus,
  UpdateQuotationDto,
} from '@/modules/quotations/types/quotation.types';

// refetchInterval (opcional): recarga sola cada N ms (Inicio). Sin él, como siempre.
export function useQuotations(params: QuotationListParams, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: quotationsKeys.list(params),
    queryFn: () => getQuotations(params),
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
    placeholderData: keepPreviousData,
  });
}

// Cotizaciones por columna del tablero en cada carga (y en cada "Ver más").
export const BOARD_PAGE_SIZE = 20;

// Las primeras de cada columna del tablero, con sus totales reales: UNA llamada
// para todas las columnas (nunca un pedido por columna).
export function useQuotationBoard(params: QuotationBoardParams, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: quotationsKeys.board(params),
    queryFn: () => getQuotationBoard({ ...params, perStatus: BOARD_PAGE_SIZE }),
    refetchInterval: options?.refetchInterval,
    placeholderData: keepPreviousData,
  });
}

// "Ver más" de una columna: las páginas siguientes de ese estado, en el mismo
// orden que el tablero (la que llegó al estado más recientemente, primero). Solo
// se pide cuando el usuario lo abre (enabled).
export function useQuotationBoardColumnMore(status: QuotationStatus, params: QuotationBoardParams, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: quotationsKeys.boardColumn(status, params),
    queryFn: ({ pageParam }) =>
      getQuotations({
        ...params,
        status,
        orderBy: 'status_changed_at',
        orderDir: 'desc',
        page: pageParam,
        limit: BOARD_PAGE_SIZE,
      }),
    // La página 1 ya vino con el tablero.
    initialPageParam: 2,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    enabled,
  });
}

export function useQuotation(id: number, enabled = true) {
  return useQuery({
    queryKey: quotationsKeys.detail(id),
    queryFn: () => getQuotation(id),
    enabled,
  });
}

// Solo se pide al abrir la pestaña "Ganancia" y si el rol tiene el permiso.
export function useQuotationProfit(id: number, enabled: boolean) {
  return useQuery({
    queryKey: quotationsKeys.profit(id),
    queryFn: () => getQuotationProfit(id),
    enabled,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuotation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() }),
  });
}

export function useUpdateQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateQuotationDto) => updateQuotation(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
    },
  });
}

// Completa una cotización "Pendiente de cotizar" (pedido de la web).
export function useCompleteQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CompleteQuotationDto) => completeQuotation(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
    },
  });
}

export interface ChangeQuotationStatusVariables {
  status: QuotationStatus;
  // Solo al aceptar: adelanto del cliente registrado en la misma operación.
  advancePayment?: CreateQuotationPaymentDto;
  // Solo al cerrar (Finalizada): ¿emitimos factura?
  invoiceIssued?: boolean;
}

// Registrar dinero (pago, adelanto al aceptar, gasto) cambia Caja, Estadísticas
// y los saldos/vistas previas de cierres de caja (QA M6).
function invalidateCashViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.all });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
}

export function useChangeQuotationStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, advancePayment, invoiceIssued }: ChangeQuotationStatusVariables) =>
      changeQuotationStatus(id, status, advancePayment, invoiceIssued),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
      // Cerrar con factura la deja en Facturas → "Faltan subir".
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receivablesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      invalidateCashViews(queryClient);
    },
  });
}

// Sin `id` fijo: el tablero Kanban dispara esto para cualquier tarjeta que
// se suelte en una columna distinta, no para una cotización ya abierta.
export function useChangeQuotationStatusAny() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, advancePayment, invoiceIssued }: ChangeQuotationStatusVariables & { id: number }) =>
      changeQuotationStatus(id, status, advancePayment, invoiceIssued),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receivablesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      invalidateCashViews(queryClient);
    },
  });
}

export function useChangeQuotationItemStage(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, stageId }: { itemId: number; stageId: number }) => changeQuotationItemStage(itemId, stageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}

export function useCreateQuotationPayment(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuotationPaymentDto) => createQuotationPayment(quotationId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receivablesKeys.lists() });
      queryClient.invalidateQueries({ queryKey: paymentsKeys.lists() });
      invalidateCashViews(queryClient);
    },
  });
}

export function useDownloadQuotationPdf() {
  return useMutation({
    mutationFn: (id: number) => downloadQuotationPdf(id),
  });
}

// Para la vista previa: useQuery (no mutation) para que el blob quede en
// caché mientras el modal de preview sigue abierto, sin volver a generar
// el PDF si se abre/cierra rápido dos veces. La key cuelga del detalle
// (quotationsKeys.pdf): antes era una key suelta que nada invalidaba, y tras
// cambiar el estado la vista previa seguía mostrando el PDF viejo hasta 1 min.
export function usePreviewQuotationPdf(id: number | null) {
  return useQuery({
    queryKey: quotationsKeys.pdf(id ?? 0),
    queryFn: () => downloadQuotationPdf(id as number),
    enabled: id !== null,
    staleTime: 60 * 1000,
  });
}

// Corregir/anular un gasto cambia la cotización (pestaña Gastos, márgenes),
// Caja y Estadísticas, y su historial de correcciones.
function invalidateAfterExpenseChange(queryClient: QueryClient, expenseId: number) {
  queryClient.invalidateQueries({ queryKey: quotationsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashMovementsKeys.all });
  queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  queryClient.invalidateQueries({ queryKey: cashClosingsKeys.all });
  queryClient.invalidateQueries({ queryKey: moneyCorrectionsKeys.history('quotation_expense', expenseId) });
}

export function useQuotationExpense(id: number) {
  return useQuery({
    queryKey: quotationsKeys.expense(id),
    queryFn: () => getQuotationExpense(id),
    // Siempre lo vigente al abrir el diálogo de corrección.
    staleTime: 0,
  });
}

export function useCorrectQuotationExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CorrectQuotationExpenseDto }) => correctQuotationExpense(id, dto),
    onSuccess: (_data, { id }) => invalidateAfterExpenseChange(queryClient, id),
  });
}

export function useToggleQuotationExpenseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReasonedToggleInput) => toggleQuotationExpense(input),
    onSuccess: (_data, { id }) => invalidateAfterExpenseChange(queryClient, id),
  });
}

export function useCreateQuotationExpense(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuotationExpenseDto) => createQuotationExpense(quotationId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
      invalidateCashViews(queryClient);
    },
  });
}
