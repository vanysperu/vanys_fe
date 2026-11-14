// Espejo de grulla_be: invoice/types/invoice.types.ts y google_drive.types.ts.

export const INVOICE_MAX_FILE_MB = 5;
export const INVOICE_PDF_TYPE = 'application/pdf';

export type InvoiceType = 'issued' | 'purchase';
export type InvoiceDriveStatus = 'none' | 'pending' | 'copied' | 'failed';
export type InvoiceCurrency = 'PEN' | 'USD';
// Factura de una compra (Sprint 2, ítem 3): pending = llega después.
export type PurchaseInvoiceStatus = 'linked' | 'pending' | 'not_required';

export interface LocalDateTime {
  date: string;
  time: string;
}

// Una compra cubierta por una factura de compra (una factura puede cubrir
// varios productos, incluso de cotizaciones distintas de la misma tienda).
export interface InvoicePurchaseLine {
  purchase_id: number;
  product_name: string;
  quantity: number;
  amount: number;
  quotation_code: string;
}

export interface Invoice {
  id: number;
  type: InvoiceType;
  quotation_id: number;
  quotation_code: string;
  // Todas las cotizaciones que cubre (la principal primero).
  quotation_codes: string[];
  // Compras vigentes de la factura (vacío en una emitida).
  purchases: InvoicePurchaseLine[];
  purchases_total: number;
  description: string;
  // Datos de la factura de compra (Sprint 2, ítem 3; opcionales).
  supplier_id: number | null;
  supplier_name: string | null;
  series_number: string | null;
  issue_date: string | null;
  currency: InvoiceCurrency | null;
  total: number | null;
  // null = junta compras de varias tiendas.
  business_unit_id: number | null;
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

// GET /invoice/purchase-candidates: factura a la que se puede sumar una compra.
export interface PurchaseInvoiceCandidate {
  id: number;
  series_number: string | null;
  supplier_name: string | null;
  quotation_codes: string[];
  description: string;
  has_file: boolean;
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
  supplierId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceListResult {
  data: Invoice[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  // pending_purchases_count: compras con la factura pendiente (pestaña "Compras sin factura").
  summary: { pending_count: number; drive_failed_count: number; pending_purchases_count: number };
}

// ---- Compras sin factura (Sprint 2, ítem 3) ----

export interface PendingPurchase {
  purchase_id: number;
  invoice_status: Exclude<PurchaseInvoiceStatus, 'linked'>;
  product_name: string;
  quantity: number;
  amount: number;
  quotation_id: number;
  quotation_code: string;
  client_name: string | null;
  company_id: number;
  business_unit_id: number | null;
  business_unit_name: string | null;
  spent_at: string;
  created_at: LocalDateTime;
  created_by_name: string | null;
}

export interface PendingPurchaseParams {
  page: number;
  limit: number;
  companyId?: number;
  storeId?: number;
  includeNotRequired?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PendingPurchaseListResult {
  data: PendingPurchase[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { pending_count: number };
}

export interface InvoiceDetailsDto {
  supplier_id?: number | null;
  series_number?: string | null;
  issue_date?: string | null;
  currency?: InvoiceCurrency | null;
  total?: number | null;
}

export interface LinkPurchasesDto extends InvoiceDetailsDto {
  purchase_ids: number[];
  // Sumar a una factura ya registrada (sin esto, se crea una nueva).
  invoice_id?: number;
  allow_duplicate?: boolean;
  file?: File | null;
}

export interface LinkPurchasesResult {
  invoice_id: number;
  created: boolean;
  linked_purchase_ids: number[];
  file_uploaded: boolean;
  file_error: string | null;
}

// Código con que el backend avisa una factura repetida (proveedor + serie-número).
export const INVOICE_DUPLICATE_CODE = 'INVOICE_DUPLICATE_NUMBER';

export const CURRENCY_LABEL: Record<InvoiceCurrency, string> = { PEN: 'Soles (S/)', USD: 'Dólares (US$)' };

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
