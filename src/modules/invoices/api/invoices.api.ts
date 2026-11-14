import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  DriveStatus,
  InvoiceDriveStatus,
  InvoiceDetailsDto,
  InvoiceListParams,
  InvoiceListResult,
  LinkPurchasesDto,
  LinkPurchasesResult,
  PendingPurchaseListResult,
  PendingPurchaseParams,
  PurchaseInvoiceCandidate,
  UploadInvoiceFileResult,
} from '@/modules/invoices/types/invoice.types';

// ---- Compras sin factura (Sprint 2, ítem 3) ----

export async function getPendingPurchases(params: PendingPurchaseParams): Promise<PendingPurchaseListResult> {
  const response = await apiClient.get<ApiResponse<PendingPurchaseListResult>>('/invoice/pending-purchases', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Una factura para varias compras (nueva o ya registrada). Va como multipart
// para mandar el archivo en el mismo paso; los vacíos no se mandan.
export async function linkPurchases({ file, purchase_ids, ...fields }: LinkPurchasesDto): Promise<LinkPurchasesResult> {
  const formData = new FormData();
  formData.append('purchase_ids', purchase_ids.join(','));
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    formData.append(key, String(value));
  });
  if (file) formData.append('file', file);
  const response = await apiClient.post<ApiResponse<LinkPurchasesResult>>('/invoice/link-purchases', formData);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function removeInvoicePurchase({ invoiceId, purchaseId }: { invoiceId: number; purchaseId: number }): Promise<{ invoice_deleted: boolean }> {
  const response = await apiClient.put<ApiResponse<{ invoice_deleted: boolean }>>(`/invoice/${invoiceId}/remove-purchase`, {
    purchase_id: purchaseId,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateInvoiceDetails({
  invoiceId,
  dto,
}: {
  invoiceId: number;
  dto: InvoiceDetailsDto & { allow_duplicate?: boolean };
}): Promise<{ id: number }> {
  const response = await apiClient.put<ApiResponse<{ id: number }>>(`/invoice/${invoiceId}/details`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Facturas de compra a las que se puede sumar la compra de un item.
export async function getPurchaseInvoiceCandidates(itemId: number, search?: string): Promise<PurchaseInvoiceCandidate[]> {
  const response = await apiClient.get<ApiResponse<PurchaseInvoiceCandidate[]>>('/invoice/purchase-candidates', {
    params: { itemId, search },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getInvoices(params: InvoiceListParams): Promise<InvoiceListResult> {
  const response = await apiClient.get<ApiResponse<InvoiceListResult>>('/invoice/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function uploadInvoiceFile({ invoiceId, file }: { invoiceId: number; file: File }): Promise<UploadInvoiceFileResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post<ApiResponse<UploadInvoiceFileResult>>(`/invoice/${invoiceId}/file`, formData);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// El archivo es privado (solo con sesión): se descarga con el token y se abre
// desde la memoria del navegador, nunca por una URL pública.
export async function getInvoiceFile(invoiceId: number): Promise<Blob> {
  const response = await apiClient.get<Blob>(`/invoice/${invoiceId}/file`, { responseType: 'blob' });
  return response.data;
}

export async function retryInvoiceDrive(
  invoiceId: number,
): Promise<{ id: number; copied: boolean; drive_status: InvoiceDriveStatus; drive_error: string | null }> {
  const response = await apiClient.put<
    ApiResponse<{ id: number; copied: boolean; drive_status: InvoiceDriveStatus; drive_error: string | null }>
  >(`/invoice/${invoiceId}/drive-retry`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// --- Google Drive de cada empresa (solo Super Administrador) ---

export async function getDriveStatus(companyId: number): Promise<DriveStatus> {
  const response = await apiClient.get<ApiResponse<DriveStatus>>(`/google-drive/status/${companyId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getDriveConnectUrl(companyId: number): Promise<{ url: string }> {
  const response = await apiClient.get<ApiResponse<{ url: string }>>(`/google-drive/connect-url/${companyId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function disconnectDrive(companyId: number): Promise<{ company_id: number }> {
  const response = await apiClient.put<ApiResponse<{ company_id: number }>>(`/google-drive/disconnect/${companyId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
