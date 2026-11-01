import type { PagedListResult } from '@/config/api.types';

// Espejo de EmployeeDebtSummaryItem (grulla_be: employee_debt/services/find)
// — agregado por trabajador, no fila por fila de compra.
export interface EmployeeDebtSummaryItem {
  user_id: number;
  // Empresa del trabajador: solo se le puede reponer desde cuentas de ella.
  company_id: number;
  employee_name: string;
  pending_amount: number;
  pending_count: number;
  // Lo ya repuesto (para el filtro "Pagadas").
  paid_amount: number;
  paid_count: number;
  last_paid_at: string | null;
}

export type EmployeeDebtListResult = PagedListResult<EmployeeDebtSummaryItem>;

// "pending" (por defecto) = con algo pendiente de reponer; "paid" = con
// reposiciones ya hechas; "all" = todos.
export type EmployeeDebtStatusFilter = 'pending' | 'paid' | 'all';

export const EMPLOYEE_DEBT_STATUS_LABEL: Record<EmployeeDebtStatusFilter, string> = {
  pending: 'Pendientes de pagar',
  paid: 'Ya pagadas',
  all: 'Todas',
};

export interface EmployeeDebtListParams {
  page?: number;
  limit?: number;
  status?: EmployeeDebtStatusFilter;
  userId?: number;
  // Rango sobre el día en que el trabajador puso el dinero (YYYY-MM-DD).
  dateFrom?: string;
  dateTo?: string;
}

export interface PayEmployeeDebtDto {
  // Cuenta desde la que se le repone (null = efectivo).
  payment_account_id: number | null;
  // Monto a abonar ahora (pagos parciales): puede ser menor al total
  // pendiente, nunca mayor (el backend lo revalida).
  amount: number;
}

// --- Detalle de un trabajador -------------------------------------------

// "purchase": nació de una compra de orden pagada con su plata. "manual": la
// registró un administrador (ej. pagó la luz con su plata).
export type EmployeeDebtOrigin = 'purchase' | 'manual';

// "cancelled": deuda manual anulada antes de reponerse.
export type EmployeeDebtRowStatus = 'pending' | 'paid' | 'cancelled';

export const EMPLOYEE_DEBT_ROW_STATUS_LABEL: Record<EmployeeDebtRowStatus, string> = {
  pending: 'Pendiente',
  paid: 'Repuesta',
  cancelled: 'Anulada',
};

export interface EmployeeDebtDetailItem {
  id: number;
  origin: EmployeeDebtOrigin;
  description: string;
  category: string | null;
  incurred_at: string;
  amount: number;
  paid_amount: number;
  pending_amount: number;
  status: EmployeeDebtRowStatus;
  paid_at: string | null;
  quotation_id: number | null;
  purchase_order_id: number | null;
  registered_by_name: string | null;
}

export interface EmployeeDebtDetailParams {
  userId: number;
  page?: number;
  limit?: number;
  status?: EmployeeDebtRowStatus | 'all';
}

// Una reposición (el egreso de Caja de lo que el trabajador pagó).
export interface EmployeeDebtPaymentItem {
  id: number;
  company_id: number;
  user_id: number;
  employee_name: string;
  amount: number;
  paid_at: string;
  payment_account_id: number | null;
  payment_account_name: string | null;
  is_deleted: boolean;
  registered_by_name: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface EmployeeDebtPaymentListParams {
  userId?: number;
  page?: number;
  limit?: number;
}

export interface CreateManualEmployeeDebtDto {
  // Solo el Super Administrador (elige la empresa).
  company_id?: number;
  business_unit_id?: number | null;
  user_id: number;
  description: string;
  // prefix_id del catálogo "cash_movement_type" (el mismo de Caja).
  category: string;
  amount: number;
  // YYYY-MM-DD, día en que el trabajador pagó.
  incurred_at: string;
}
