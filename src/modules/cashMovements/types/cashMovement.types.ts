import type { PagedListResult } from '@/config/api.types';

export type CashMovementDirection = 'income' | 'expense';

export const CASH_MOVEMENT_DIRECTION_LABEL: Record<CashMovementDirection, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
};

// Espejo de CashMovementListItem (grulla_be: cash_movement/services/find).
// "source" distingue si la fila vive en cash_movement (editable/deshabilitable
// desde este módulo) o es un reflejo de un pago/gasto ya registrado en su
// propia pantalla (solo lectura acá).
export type CashMovementSource = 'manual' | 'quotation_payment' | 'quotation_expense';

export interface CashMovementListItem {
  id: string;
  source: CashMovementSource;
  source_id: number;
  direction: CashMovementDirection;
  category: string | null;
  amount: number;
  description: string | null;
  occurred_at: string;
  quotation_id: number | null;
  purchase_order_id: number | null;
  business_unit_id: number | null;
  created_at: string;
}

export type CashMovementListResult = PagedListResult<CashMovementListItem>;

export interface CashMovementListParams {
  page?: number;
  limit?: number;
  direction?: CashMovementDirection;
  category?: string;
  quotationId?: number;
  purchaseOrderId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateCashMovementDto {
  direction: CashMovementDirection;
  category: string;
  amount: number;
  description?: string;
  // "YYYY-MM-DD"
  occurred_at: string;
  quotation_id?: number;
  purchase_order_id?: number;
  // Solo la usa un is_system (elige la tienda al no tener una propia); un
  // admin de empresa limitado a su tienda queda forzado server-side.
  business_unit_id?: number;
}
