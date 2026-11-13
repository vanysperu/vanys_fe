// Espejo de grulla_be/src/api/modules/inventory/types (Sprint 2, ítem 2).

export type DocType = 'entry' | 'exit' | 'transfer' | 'adjustment';
export type DocStatus = 'draft' | 'posted' | 'dispatched' | 'received' | 'partially_received' | 'cancelled';
export type ExitOn = 'delivered' | 'dispatch_guide';

export interface DateTimeParts {
  date: string;
  time: string;
}

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  entry: 'Ingreso',
  exit: 'Salida',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
};

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  draft: 'Borrador',
  posted: 'Confirmado',
  dispatched: 'En tránsito',
  received: 'Recibida',
  partially_received: 'Recibida parcial',
  cancelled: 'Anulado',
};

// Motivos por tipo (mismos códigos que el backend, REASONS).
export const REASON_LABEL: Record<string, string> = {
  purchase: 'Compra',
  customer_return: 'Devolución de cliente',
  opening: 'Inventario inicial',
  production: 'Producción',
  other_entry: 'Otro ingreso',
  sale: 'Venta / entrega',
  internal_use: 'Consumo interno',
  shrinkage: 'Merma',
  sample: 'Muestra',
  supplier_return: 'Devolución a proveedor',
  other_exit: 'Otra salida',
  transfer: 'Transferencia',
  count_difference: 'Diferencia de conteo',
  damage: 'Daño',
  other_adjustment: 'Otro ajuste',
  reversal: 'Anulación',
};

export const REASONS_BY_TYPE: Record<DocType, string[]> = {
  entry: ['purchase', 'customer_return', 'opening', 'production', 'other_entry'],
  exit: ['sale', 'internal_use', 'shrinkage', 'sample', 'supplier_return', 'other_exit'],
  transfer: ['transfer'],
  adjustment: ['count_difference', 'damage', 'other_adjustment'],
};

export interface Warehouse {
  id: number;
  company_id: number;
  business_unit_id: number;
  businessUnitName: string | null;
  code: string;
  name: string;
  address: string | null;
  ubigeo: string | null;
  sunat_establishment_code: string | null;
  allow_negative_stock: boolean;
  track_lots: boolean;
  track_expiry: boolean;
  expiry_alert_days: number;
  block_expired: boolean;
  is_default: boolean;
  active: boolean;
}

export interface SaveWarehouseDto {
  company_id?: number;
  business_unit_id: number;
  code: string;
  name: string;
  address?: string | null;
  ubigeo?: string | null;
  sunat_establishment_code?: string | null;
  allow_negative_stock: boolean;
  track_lots: boolean;
  track_expiry: boolean;
  expiry_alert_days: number;
  block_expired: boolean;
  is_default: boolean;
}

export interface StoreSettings {
  id: number;
  code: string | null;
  inventory_enabled: boolean;
  inventory_exit_on: ExitOn;
}

export interface StockRow {
  productId: number;
  productName: string;
  sku: string | null;
  color: string;
  byWarehouse: { warehouseId: number; warehouseName: string; quantity: number }[];
  total: number;
  avgCost: number | null;
}

export interface KardexRow {
  id: number;
  at: DateTimeParts;
  warehouseName: string;
  document: { id: number; number: string; doc_type: DocType | ''; reason_code: string };
  lotCode: string | null;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number | null;
  userName: string | null;
}

export interface KardexResult {
  data: KardexRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  openingBalance: number;
  closingBalance: number;
}

export interface DocumentLine {
  id: number;
  product_id: number;
  productName: string;
  color: string;
  lot_id: number | null;
  lotCode: string | null;
  expiry_date: string | null;
  quantity: number;
  received_quantity: number | null;
  unit_cost: number | null;
}

export interface StockDocument {
  id: number;
  company_id: number;
  doc_type: DocType;
  reason_code: string;
  number: string;
  status: DocStatus;
  document_date: string;
  warehouse: { id: number; name: string };
  targetWarehouse: { id: number; name: string } | null;
  quotation_id: number | null;
  reversal_of_id: number | null;
  notes: string | null;
  cancel_reason: string | null;
  createdBy: string | null;
  createdAt: DateTimeParts;
  postedAt: DateTimeParts | null;
  lines: DocumentLine[];
}

export interface DocumentLineInput {
  product_id: number;
  color?: string | null;
  lot_id?: number | null;
  lot_code?: string | null;
  expiry_date?: string | null;
  quantity: number;
  unit_cost?: number | null;
}

export interface SaveDocumentDto {
  company_id?: number;
  doc_type: DocType;
  warehouse_id: number;
  target_warehouse_id?: number | null;
  reason_code: string;
  document_date: string;
  notes?: string | null;
  lines: DocumentLineInput[];
}

export interface DocumentListParams {
  page: number;
  limit: number;
  docType?: DocType;
  status?: DocStatus;
  warehouseId?: number;
  companyId?: number;
}

export interface SuggestedLot {
  lotId: number;
  lotCode: string;
  expiryDate: string | null;
  quantity: number;
}

export interface OwnStockLookup {
  productId: number;
  byWarehouse: { warehouseId: number; warehouseName: string; color: string; quantity: number }[];
  total: number;
}
