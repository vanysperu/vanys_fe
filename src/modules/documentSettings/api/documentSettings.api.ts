import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CompanyDocumentSettings,
  UpdateCompanyDocumentSettingsDto,
} from '@/modules/documentSettings/types/documentSettings.types';

export async function getMyDocumentSettings(): Promise<CompanyDocumentSettings> {
  const response = await apiClient.get<ApiResponse<CompanyDocumentSettings>>('/company/my-document-settings');
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateMyDocumentSettings(dto: UpdateCompanyDocumentSettingsDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>('/company/my-document-settings', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Sube el logo o un QR de pago — un solo endpoint genérico en el backend,
// devuelve la ruta relativa a guardar (en company.logo_url o en el ref2 de
// una fila de general_variable, según qué llame a esto).
export async function uploadCompanyAsset(file: File): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiResponse<{ path: string }>>('/uploads/company-asset', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
