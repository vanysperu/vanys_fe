import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type { QuotationMockup, UploadMockupInput } from '@/modules/quotations/types/mockup.types';

// Mockups (diseños) de una cotización (21-nov). Hasta 40 por cotización, así
// que una sola página de 50 los trae todos.
export async function listQuotationMockups(quotationId: number): Promise<PagedListResult<QuotationMockup>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<QuotationMockup>>>(`/quotation/${quotationId}/mockups`, {
    params: { page: 1, limit: 50 },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function uploadQuotationMockup(quotationId: number, input: UploadMockupInput): Promise<QuotationMockup> {
  const form = new FormData();
  form.append('file', input.file);
  if (input.quotationItemId) form.append('quotation_item_id', String(input.quotationItemId));
  if (input.caption.trim()) form.append('caption', input.caption.trim());
  const response = await apiClient.post<ApiResponse<QuotationMockup>>(`/quotation/${quotationId}/mockups`, form);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// El archivo en sí, con la sesión (blob para mostrarlo o descargarlo).
export async function getQuotationMockupFile(mockupId: number): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/quotation/mockup/${mockupId}/file`, { responseType: 'blob' });
  return response.data;
}

export async function disableQuotationMockup(mockupId: number): Promise<void> {
  const response = await apiClient.patch<ApiResponse<{ id: number }>>(`/quotation/mockup/${mockupId}/disable`);
  if (!response.data.success) throw response.data;
}
