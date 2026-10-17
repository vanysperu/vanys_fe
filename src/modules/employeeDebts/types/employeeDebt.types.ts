import type { PagedListResult } from '@/config/api.types';

// Espejo de EmployeeDebtSummaryItem (grulla_be: employee_debt/services/find)
// — agregado por trabajador, no fila por fila de compra.
export interface EmployeeDebtSummaryItem {
  user_id: number;
  employee_name: string;
  pending_amount: number;
  pending_count: number;
}

export type EmployeeDebtListResult = PagedListResult<EmployeeDebtSummaryItem>;

export interface EmployeeDebtListParams {
  page?: number;
  limit?: number;
}
