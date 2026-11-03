import { cashClosingsKeys } from '@/modules/cashClosings/hooks/cashClosings.keys';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import { keepPreviousData, type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  getQuotations,
  updateQuotation,
} from '@/modules/quotations/api/quotations.api';
import { paymentsKeys } from '@/modules/payments/hooks/payments.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import { receivablesKeys } from '@/modules/receivables/hooks/receivables.keys';
import type {
  CompleteQuotationDto,
  CorrectQuotationExpenseDto,
  CreateQuotationExpenseDto,
  CreateQuotationPaymentDto,
  QuotationListParams,
  QuotationStatus,
  UpdateQuotationDto,
} from '@/modules/quotations/types/quotation.types';

export function useQuotations(params: QuotationListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: quotationsKeys.list(params),
    queryFn: () => getQuotations(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useQuotation(id: number, enabled = true) {
  return useQuery({
    queryKey: quotationsKeys.detail(id),
    queryFn: () => getQuotation(id),
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
    mutationFn: ({ status, advancePayment }: ChangeQuotationStatusVariables) =>
      changeQuotationStatus(id, status, advancePayment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
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
    mutationFn: ({ id, status, advancePayment }: ChangeQuotationStatusVariables & { id: number }) =>
      changeQuotationStatus(id, status, advancePayment),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(id) });
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
