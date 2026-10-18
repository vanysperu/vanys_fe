import type { PagedListResult } from '@/config/api.types';
import type { QuotationStatus } from '@/modules/quotations/types/quotation.types';

// Espejo de ReceivableListItem (grulla_be: receivable/services/find).
export interface ReceivableListItem {
  quotation_id: number;
  client_id: number;
  client_name: string;
  status: QuotationStatus;
  total: number;
  total_paid: number;
  balance: number;
  business_unit_id: number | null;
  created_at: string;
  // Último pago recibido (YYYY-MM-DD); null = todavía no pagó nada.
  last_paid_at: string | null;
}

export interface ReceivableSummary {
  // Totales de TODO lo filtrado, no solo de la página visible.
  total_balance: number;
  quotation_count: number;
}

export type ReceivableListResult = PagedListResult<ReceivableListItem> & { summary: ReceivableSummary };

export type ReceivableOrderBy = 'created_at' | 'balance' | 'total';

export interface ReceivableListParams {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  clientName?: string;
  businessUnitId?: number;
  // Fecha de emisión (YYYY-MM-DD).
  dateFrom?: string;
  dateTo?: string;
  orderBy?: ReceivableOrderBy;
  orderDir?: 'asc' | 'desc';
}

// Estados que cuentan como "por cobrar" (mismo listado que el backend:
// RECEIVABLE_STATUSES). Una cotización pendiente todavía no es una deuda.
export const RECEIVABLE_STATUSES: QuotationStatus[] = [
  'accepted',
  'design_pending',
  'in_process',
  'ready',
  'delivered',
  'finished',
];
