import type { PagedListResult } from '@/config/api.types';

// Espejo de EmployeeDebtSummaryItem (grulla_be: employee_debt/services/find)
// — agregado por trabajador, no fila por fila de compra.
export interface EmployeeDebtSummaryItem {
  user_id: number;
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
  // Rango sobre la fecha de la compra que generó la deuda (YYYY-MM-DD).
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
