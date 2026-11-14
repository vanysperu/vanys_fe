// Espejo de grulla_be: dispatch_guide/types/dispatch_guide.types.ts (Sprint 2,
// ítem 1, guía de remisión en modo manual).

type DateParts = { date: string; time: string };

export type GuideStatus = 'draft' | 'sending' | 'accepted' | 'rejected' | 'error' | 'manual' | 'voided';
export type TransportMode = 'public' | 'private';

// Motivos de traslado (catálogo 20 de SUNAT) que ofrece el sistema (plan §9.2).
export const GUIDE_REASONS: Record<string, string> = {
  '01': 'Venta',
  '02': 'Compra',
  '03': 'Venta con entrega a terceros',
  '04': 'Traslado entre establecimientos de la misma empresa',
  '05': 'Consignación',
  '06': 'Devolución',
  '07': 'Recojo de bienes transformados',
  '13': 'Otros',
  '14': 'Venta sujeta a confirmación',
  '17': 'Traslado de bienes para transformación',
};

// Catálogo 06 de SUNAT (documento de identidad).
export const IDENTITY_DOC_TYPES: Record<string, string> = { '6': 'RUC', '1': 'DNI', '4': 'Carné de extranjería', '7': 'Pasaporte', '0': 'Otro' };

// Catálogo 61 de SUNAT (documentos relacionados) más comunes.
export const RELATED_DOC_TYPES: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta de venta',
  '09': 'Guía de remisión remitente',
  '31': 'Guía de remisión transportista',
  '49': 'Constancia de depósito - IVAP',
  '50': 'Declaración aduanera de mercancías',
  '52': 'Declaración simplificada (DS)',
  '80': 'Constancia de depósito - detracción',
};

export const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: 'Borrador',
  sending: 'Enviando',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  error: 'Error',
  manual: 'Registrada',
  voided: 'Anulada',
};

// Códigos con los que el backend rechaza algo de la guía.
export const GUIDE_INCOMPLETE_CODE = 'GUIDE_INCOMPLETE';
export const DISPATCH_EXCEEDS_PENDING_CODE = 'DISPATCH_EXCEEDS_PENDING';

// ------------------------------------------------------------- catálogos
export interface Vehicle {
  id: number;
  company_id: number;
  plate: string;
  description: string | null;
  authorization_number: string | null;
  active: boolean;
  createdAt: DateParts;
}

export interface SaveVehicleDto {
  company_id?: number;
  plate: string;
  description?: string | null;
  authorization_number?: string | null;
}

export interface Driver {
  id: number;
  company_id: number;
  doc_type: string;
  doc_number: string;
  first_names: string;
  last_names: string;
  license_number: string;
  active: boolean;
  createdAt: DateParts;
}

export interface SaveDriverDto {
  company_id?: number;
  doc_type: string;
  doc_number: string;
  first_names: string;
  last_names: string;
  license_number: string;
}

export interface CatalogListParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  searchTerm?: string;
  status?: string;
  companyId?: number;
}

export interface Carrier {
  id: number;
  name: string;
  document_number: string | null;
  mtc_registration: string | null;
}

// ---------------------------------------------------------------- guías
export interface GuideLineInput {
  product_id?: number | null;
  quotation_item_id?: number | null;
  product_code?: string | null;
  description: string;
  color?: string | null;
  quantity: number;
  unit_code?: string | null;
}

export interface GuideRelatedDocumentInput {
  doc_type: string;
  series_number: string;
  issuer_ruc?: string | null;
}

export interface SaveGuideDto {
  company_id?: number | null;
  business_unit_id?: number | null;
  quotation_id?: number | null;
  stock_document_id?: number | null;
  reason_code: string;
  reason_note?: string | null;
  transfer_start_date?: string | null;
  transport_mode: TransportMode;
  light_vehicle?: boolean;
  gross_weight_kg?: number | null;
  packages?: number | null;
  origin_warehouse_id?: number | null;
  origin_address?: string | null;
  origin_ubigeo?: string | null;
  origin_establishment_code?: string | null;
  destination_warehouse_id?: number | null;
  destination_address?: string | null;
  destination_ubigeo?: string | null;
  destination_establishment_code?: string | null;
  client_id?: number | null;
  recipient_doc_type?: string | null;
  recipient_doc_number?: string | null;
  recipient_name?: string | null;
  carrier_supplier_id?: number | null;
  vehicle_ids?: number[];
  driver_ids?: number[];
  notes?: string | null;
  lines: GuideLineInput[];
  related_documents?: GuideRelatedDocumentInput[];
}

export interface GuideSummary {
  id: number;
  company_id: number;
  business_unit_id: number | null;
  business_unit_name: string | null;
  series: string | null;
  number: number | null;
  number_text: string | null;
  status: GuideStatus;
  issue_date: string | null;
  transfer_start_date: string | null;
  reason_code: string;
  reason_label: string;
  recipient_name: string | null;
  recipient_doc_number: string | null;
  destination_address: string | null;
  quotation_id: number | null;
  stock_document_id: number | null;
  has_pdf: boolean;
  createdAt: DateParts;
}

export interface Guide extends GuideSummary {
  reason_note: string | null;
  transport_mode: TransportMode;
  light_vehicle: boolean;
  gross_weight_kg: number | null;
  packages: number | null;
  origin_warehouse_id: number | null;
  origin_warehouse_name: string | null;
  origin_address: string | null;
  origin_ubigeo: string | null;
  origin_establishment_code: string | null;
  destination_warehouse_id: number | null;
  destination_warehouse_name: string | null;
  destination_ubigeo: string | null;
  destination_establishment_code: string | null;
  client_id: number | null;
  recipient_doc_type: string | null;
  carrier_supplier_id: number | null;
  carrier_ruc: string | null;
  carrier_name: string | null;
  carrier_mtc_registration: string | null;
  stock_document_number: string | null;
  exit_document: { id: number; number_text: string; status: string } | null;
  notes: string | null;
  lines: (GuideLineInput & { id: number; line_no: number; color: string; unit_code: string })[];
  vehicles: { vehicle_id: number | null; plate: string | null; is_main: boolean }[];
  drivers: {
    driver_id: number | null;
    doc_type: string | null;
    doc_number: string | null;
    first_names: string | null;
    last_names: string | null;
    license_number: string | null;
    is_main: boolean;
  }[];
  related_documents: { doc_type: string; doc_type_label: string; series_number: string; issuer_ruc: string | null }[];
  pdf: { file_name: string; size_bytes: number; uploadedAt: DateParts } | null;
  registeredAt: DateParts | null;
  voidedAt: DateParts | null;
  void_reason: string | null;
}

export interface GuideListParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  searchTerm?: string;
  status?: string;
  quotationId?: number;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
}

export interface PrefillLine extends GuideLineInput {
  ordered: number | null;
  dispatched: number | null;
  pending: number | null;
}

export interface GuidePrefill extends Omit<SaveGuideDto, 'lines'> {
  company_id: number;
  business_unit_id: number | null;
  business_unit_name: string | null;
  source: { kind: 'quotation' | 'transfer'; id: number; label: string };
  lines: PrefillLine[];
  warnings: string[];
}

export interface RegisterGuideDto {
  series: string;
  number: number;
  issue_date?: string | null;
  file?: File | null;
}
