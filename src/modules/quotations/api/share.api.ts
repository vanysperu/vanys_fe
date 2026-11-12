import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import { API_URL } from '@/config/appConfig';
import type {
  PublicLink,
  PublicQuotationView,
  SendQuotationEmailDto,
  SendQuotationEmailResult,
} from '@/modules/quotations/types/share.types';

// Compartir la cotización (Sprint 2, ítem 7).

export async function getPublicLink(quotationId: number): Promise<PublicLink> {
  const response = await apiClient.get<ApiResponse<PublicLink>>(`/quotation/${quotationId}/public-link`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function setPublicLinkEnabled(quotationId: number, enabled: boolean): Promise<PublicLink> {
  const response = await apiClient.put<ApiResponse<PublicLink>>(`/quotation/${quotationId}/public-link`, { enabled });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function regeneratePublicLink(quotationId: number): Promise<PublicLink> {
  const response = await apiClient.post<ApiResponse<PublicLink>>(`/quotation/${quotationId}/public-link/regenerate`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function logWhatsappShare(quotationId: number, phone: string | null): Promise<void> {
  const response = await apiClient.post<ApiResponse<null>>(`/quotation/${quotationId}/share/whatsapp`, { phone });
  if (!response.data.success) throw response.data;
}

export async function sendQuotationEmail(
  quotationId: number,
  dto: SendQuotationEmailDto,
): Promise<{ result: SendQuotationEmailResult; message: string }> {
  const response = await apiClient.post<ApiResponse<SendQuotationEmailResult>>(`/quotation/${quotationId}/share/email`, dto);
  if (!response.data.success) throw response.data;
  return { result: response.data.data, message: response.data.message ?? '' };
}

// Vista pública: sin sesión (el backend no la pide).
export async function getPublicQuotation(code: string): Promise<PublicQuotationView> {
  const response = await apiClient.get<ApiResponse<PublicQuotationView>>(`/public/q/${encodeURIComponent(code)}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// PDF de la vista pública: un enlace directo (el navegador lo abre o lo baja).
export const publicQuotationPdfUrl = (code: string): string => `${API_URL}/public/q/${encodeURIComponent(code)}/pdf`;
