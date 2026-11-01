import type { PagedListResult } from '@/config/api.types';

export type CashMovementDirection = 'income' | 'expense';

export const CASH_MOVEMENT_DIRECTION_LABEL: Record<CashMovementDirection, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
};

// Espejo de CashMovementListItem (grulla_be: cash_movement/services/find).
// "source" distingue si la fila vive en cash_movement (editable/deshabilitable
// desde este módulo) o es un reflejo de algo registrado en su propia pantalla
// (solo lectura acá): pagos y gastos de cotizaciones, gastos que un
// trabajador pagó con su plata (deuda manual) y reposiciones a trabajadores.
export type CashMovementSource =
  | 'manual'
  | 'quotation_payment'
  | 'quotation_expense'
  | 'employee_debt'
  | 'employee_debt_payment';

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
  // false = gasto pagado con plata de un trabajador: se muestra para saber
  // quién lo pagó, pero no suma (la empresa no soltó nada; su egreso es la
  // reposición).
  moves_cash: boolean;
  // Cuenta por la que entró/salió (null = efectivo; siempre null en las
  // filas que no mueven caja).
  payment_account_id: number | null;
  payment_account_name: string | null;
  // Solo en gastos pagados con plata de un trabajador.
  paid_by_employee_name: string | null;
  reimbursement_status: 'pending' | 'paid' | null;
  reimbursed_amount: number | null;
  reimbursed_at: string | null;
  // Solo en reposiciones: su monto total (con filtro de tienda o cotización,
  // amount es solo la parte que les corresponde).
  reimbursement_total: number | null;
  created_at: string;
}

export interface CashAccountSummary {
  // null = efectivo.
  payment_account_id: number | null;
  payment_account_name: string;
  income: number;
  expense: number;
  net: number;
}

// Totales de TODO lo filtrado (no de la página), solo lo que mueve caja.
export interface CashMovementSummary {
  income: number;
  expense: number;
  net: number;
  by_account: CashAccountSummary[];
}

export interface CashMovementListResult extends PagedListResult<CashMovementListItem> {
  summary: CashMovementSummary;
}

export interface CashMovementListParams {
  // Solo el Super Administrador: acotar a una empresa (si no, ve todas).
  companyId?: number;
  page?: number;
  limit?: number;
  direction?: CashMovementDirection;
  category?: string;
  source?: CashMovementSource;
  // Id de la cuenta, o "cash" para los movimientos en efectivo.
  paymentAccountId?: number | 'cash';
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
  // Desde/hacia qué cuenta se movió el dinero (null = efectivo).
  payment_account_id?: number | null;
}
