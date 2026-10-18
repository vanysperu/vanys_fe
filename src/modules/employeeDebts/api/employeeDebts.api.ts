import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  EmployeeDebtListParams,
  EmployeeDebtListResult,
  PayEmployeeDebtDto,
} from '@/modules/employeeDebts/types/employeeDebt.types';

export async function getEmployeeDebts(params: EmployeeDebtListParams): Promise<EmployeeDebtListResult> {
  const response = await apiClient.get<ApiResponse<EmployeeDebtListResult>>('/employee-debt/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function payEmployeeDebt({ userId, dto }: { userId: number; dto: PayEmployeeDebtDto }): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/pay/${userId}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
