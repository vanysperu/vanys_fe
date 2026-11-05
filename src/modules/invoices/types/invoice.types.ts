// Espejo de grulla_be: invoice/types/invoice.types.ts y google_drive.types.ts.

export const INVOICE_MAX_FILE_MB = 5;
export const INVOICE_PDF_TYPE = 'application/pdf';

export type InvoiceType = 'issued' | 'purchase';
export type InvoiceDriveStatus = 'none' | 'pending' | 'copied' | 'failed';

export interface LocalDateTime {
  date: string;
  time: string;
}

export interface Invoice {
  id: number;
  type: InvoiceType;
  quotation_id: number;
  quotation_code: string;
  purchase_id: number | null;
  description: string;
  company_id: number;
  company_name: string | null;
  has_file: boolean;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  file_uploaded_at: LocalDateTime | null;
  file_uploaded_by_name: string | null;
  stored_in_system: boolean;
  drive_status: InvoiceDriveStatus;
  drive_error: string | null;
  created_at: LocalDateTime;
  created_by_name: string | null;
}

export interface InvoiceListParams {
  page: number;
  limit: number;
  companyId?: number;
  type?: InvoiceType;
  file?: 'pending' | 'uploaded';
  drive?: InvoiceDriveStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceListResult {
  data: Invoice[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { pending_count: number; drive_failed_count: number };
}

export interface UploadInvoiceFileResult {
  id: number;
  stored_in_system: boolean;
  drive_status: InvoiceDriveStatus;
}

export interface DriveStatus {
  configured: boolean;
  storage_system: boolean;
  storage_drive: boolean;
  connected: boolean;
  email: string | null;
  connected_at: LocalDateTime | null;
  quota: { limit_bytes: number | null; usage_bytes: number } | null;
  error: string | null;
}

export const INVOICE_TYPE_LABEL: Record<InvoiceType, string> = {
  issued: 'Emitida',
  purchase: 'Compra',
};

export const DRIVE_STATUS_LABEL: Record<InvoiceDriveStatus, string> = {
  none: 'No aplica',
  pending: 'Copiando…',
  copied: 'Copiada',
  failed: 'Falló',
};
