import { apiClient } from '@/config/apiClient';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CompleteQuotationDto,
  CompleteQuotationResult,
  CorrectQuotationExpenseDto,
  CreateQuotationDto,
  CreateQuotationExpenseDto,
  QuotationExpenseDetail,
  CreateQuotationPaymentDto,
  Quotation,
  QuotationDetail,
  QuotationExpense,
  QuotationBoard,
  QuotationBoardParams,
  QuotationListParams,
  QuotationListSummary,
  QuotationPayment,
  QuotationStatus,
  UpdateQuotationDto,
} from '@/modules/quotations/types/quotation.types';

type QuotationListResult = PagedListResult<Quotation> & { summary: QuotationListSummary };

export async function getQuotations(params: QuotationListParams): Promise<QuotationListResult> {
  const response = await apiClient.get<ApiResponse<QuotationListResult>>('/quotation/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Todas las columnas del tablero en una sola llamada.
export async function getQuotationBoard(params: QuotationBoardParams & { perStatus: number }): Promise<QuotationBoard> {
  const response = await apiClient.get<ApiResponse<QuotationBoard>>('/quotation/board', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getQuotation(id: number): Promise<QuotationDetail> {
  const response = await apiClient.get<ApiResponse<QuotationDetail>>(`/quotation/find/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createQuotation(dto: CreateQuotationDto): Promise<Quotation> {
  const response = await apiClient.post<ApiResponse<Quotation>>('/quotation/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateQuotation(id: number, dto: UpdateQuotationDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/quotation/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function completeQuotation(id: number, dto: CompleteQuotationDto): Promise<CompleteQuotationResult> {
  const response = await apiClient.put<ApiResponse<CompleteQuotationResult>>(`/quotation/${id}/items`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// advancePayment: adelanto opcional que se registra en la MISMA operación
// (solo al pasar a "Aceptada") — un solo request transaccional, nunca
// "cambiar estado" y "registrar pago" como dos llamadas sueltas.
export async function changeQuotationStatus(
  id: number,
  status: QuotationStatus,
  advancePayment?: CreateQuotationPaymentDto,
): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/quotation/status/${id}`, {
    status,
    advance_payment: advancePayment ?? null,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function changeQuotationItemStage(itemId: number, stageId: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/quotation/item/${itemId}/stage`, {
    stage_id: stageId,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createQuotationPayment(
  quotationId: number,
  dto: CreateQuotationPaymentDto,
): Promise<QuotationPayment> {
  const response = await apiClient.post<ApiResponse<QuotationPayment>>(`/quotation/${quotationId}/payments`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function downloadQuotationPdf(id: number): Promise<Blob> {
  const response = await apiClient.get(`/quotation/${id}/pdf`, { responseType: 'blob' });
  return response.data;
}

export async function getQuotationExpense(id: number): Promise<QuotationExpenseDetail> {
  const response = await apiClient.get<ApiResponse<QuotationExpenseDetail>>(`/quotation/expense/find/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function correctQuotationExpense(id: number, dto: CorrectQuotationExpenseDto): Promise<{ id: number }> {
  const response = await apiClient.put<ApiResponse<{ id: number }>>(`/quotation/expense/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Anula o restaura (toggle) un gasto manual.
export async function toggleQuotationExpense({ id, reason }: ReasonedToggleInput): Promise<{ id: number; is_deleted: boolean }> {
  const response = await apiClient.put<ApiResponse<{ id: number; is_deleted: boolean }>>(`/quotation/expense/disable/${id}`, reason ? { reason } : undefined);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// URL del historial de correcciones de un gasto (para CorrectionHistoryDialog).
export const quotationExpenseCorrectionsUrl = (id: number) => `/quotation/expense/${id}/corrections`;

export async function createQuotationExpense(
  quotationId: number,
  dto: CreateQuotationExpenseDto,
): Promise<QuotationExpense> {
  const response = await apiClient.post<ApiResponse<QuotationExpense>>(`/quotation/${quotationId}/expenses`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
