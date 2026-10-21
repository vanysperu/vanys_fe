import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CreateQuotationDto,
  CreateQuotationExpenseDto,
  CreateQuotationPaymentDto,
  Quotation,
  QuotationDetail,
  QuotationExpense,
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

export async function createQuotationExpense(
  quotationId: number,
  dto: CreateQuotationExpenseDto,
): Promise<QuotationExpense> {
  const response = await apiClient.post<ApiResponse<QuotationExpense>>(`/quotation/${quotationId}/expenses`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
