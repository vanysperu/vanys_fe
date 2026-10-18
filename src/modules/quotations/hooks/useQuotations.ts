import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  changeQuotationItemStage,
  changeQuotationStatus,
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
  CreateQuotationExpenseDto,
  CreateQuotationPaymentDto,
  QuotationListParams,
  QuotationStatus,
  UpdateQuotationDto,
} from '@/modules/quotations/types/quotation.types';

export function useQuotations(params: QuotationListParams) {
  return useQuery({
    queryKey: quotationsKeys.list(params),
    queryFn: () => getQuotations(params),
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

export interface ChangeQuotationStatusVariables {
  status: QuotationStatus;
  // Solo al aceptar: adelanto del cliente registrado en la misma operación.
  advancePayment?: CreateQuotationPaymentDto;
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
// el PDF si se abre/cierra rápido dos veces.
export function usePreviewQuotationPdf(id: number | null) {
  return useQuery({
    queryKey: ['quotationPdfPreview', id],
    queryFn: () => downloadQuotationPdf(id as number),
    enabled: id !== null,
    staleTime: 60 * 1000,
  });
}

export function useCreateQuotationExpense(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateQuotationExpenseDto) => createQuotationExpense(quotationId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}
