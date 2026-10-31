import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CompanyDocumentSettings,
  UpdateCompanyDocumentSettingsDto,
} from '@/modules/documentSettings/types/documentSettings.types';

// companyId: solo para el Super Administrador (la empresa que eligió en la
// pantalla); para un usuario de empresa el backend siempre usa la suya.
export async function getMyDocumentSettings(companyId?: number): Promise<CompanyDocumentSettings> {
  const response = await apiClient.get<ApiResponse<CompanyDocumentSettings>>('/company/my-document-settings', {
    params: { companyId },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateMyDocumentSettings(
  dto: UpdateCompanyDocumentSettingsDto & { company_id?: number },
): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>('/company/my-document-settings', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Sube el logo o un QR de pago — un solo endpoint genérico en el backend,
// devuelve la ruta relativa a guardar (en company.logo_url o en el ref2 de
// una fila de general_variable, según qué llame a esto).
export async function uploadCompanyAsset({ file, companyId }: { file: File; companyId?: number }): Promise<{ path: string }> {
  const formData = new FormData();
  formData.append('file', file);
  if (companyId) formData.append('company_id', String(companyId));
  // No fijar Content-Type a mano: ese header necesita el "boundary" que
  // genera axios automáticamente a partir del FormData. Forzarlo a un
  // string fijo (sin boundary) hacía que multer/busboy en el backend no
  // pudiera parsear el archivo, y el request llegaba con req.file vacío
  // ("No se recibió ninguna imagen") tanto para el logo como para el QR.
  const response = await apiClient.post<ApiResponse<{ path: string }>>('/uploads/company-asset', formData);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
