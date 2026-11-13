// Espejo de grulla_be/src/api/modules/supplier_stock/types (Sprint 2, ítem 6).

export type StockSourceType = 'url' | 'upload';
export type StockSourceStatus = 'never' | 'running' | 'ok' | 'error';

export interface DateTimeParts {
  date: string;
  time: string;
}

// Qué columna del Excel es cada dato: su encabezado o su letra ("A", "C").
export interface StockColumnMap {
  code: string;
  quantity: string;
  color?: string | null;
  description?: string | null;
  price?: string | null;
}

export interface StockSource {
  id: number;
  company_id: number;
  supplier_id: number;
  supplierName: string | null;
  name: string;
  source_type: StockSourceType;
  // El enlace nunca vuelve en claro: solo si hay uno y su dominio.
  hasUrl: boolean;
  urlHost: string | null;
  sheet_name: string | null;
  header_row: number;
  column_map: StockColumnMap;
  refresh_minutes: number;
  last_status: StockSourceStatus;
  last_error: string | null;
  lastSuccessAt: DateTimeParts | null;
  itemCount: number;
  active: boolean;
}

export interface SaveStockSourceDto {
  company_id?: number;
  supplier_id: number;
  name: string;
  source_type: StockSourceType;
  url?: string | null;
  sheet_name?: string | null;
  header_row: number;
  column_map: StockColumnMap;
  refresh_minutes: number;
}

export interface StockSourceListParams {
  page: number;
  limit: number;
  status?: string;
  companyId?: number;
}

export interface StockImport {
  id: number;
  trigger_type: 'manual' | 'upload' | 'schedule';
  status: 'running' | 'ok' | 'error';
  rows_read: number;
  rows_valid: number;
  error: string | null;
  startedAt: DateTimeParts;
  finishedAt: DateTimeParts | null;
}

export interface ParsedStockRow {
  codeRaw: string;
  codeNorm: string;
  color: string | null;
  description: string | null;
  quantity: number | null;
  quantityText: string | null;
  price: number | null;
}

export interface StockPreviewInput {
  url?: string | null;
  sourceId?: number | null;
  sheet_name?: string | null;
  header_row: number;
  column_map?: StockColumnMap | null;
  file?: File | null;
}

export interface StockPreview {
  sheets: string[];
  sheetName: string;
  headers: string[];
  sampleRows: unknown[][];
  totalRows: number;
  parsed: ParsedStockRow[];
  parsedCount: number;
  mappingError: string | null;
}

export interface ProductSourceStock {
  sourceId: number;
  sourceName: string;
  supplierName: string | null;
  quantity: number;
  quantityTexts: string[];
  byColor: { color: string; quantity: number }[];
  updatedAt: DateTimeParts | null;
  stale: boolean;
}

export interface ProductStockLookup {
  productId: number;
  sources: ProductSourceStock[];
  total: number;
}

export interface StockSearchParams {
  page: number;
  limit: number;
  searchTerm?: string;
  onlyUnlinked?: boolean;
  companyId?: number;
}

export interface StockSearchRow {
  code: string;
  description: string | null;
  products: { id: number; name: string }[];
  bySource: { sourceId: number; sourceName: string; quantity: number | null; quantityText: string | null }[];
  total: number;
}
