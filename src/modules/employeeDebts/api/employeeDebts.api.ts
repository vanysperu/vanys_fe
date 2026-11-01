import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CreateManualEmployeeDebtDto,
  EmployeeDebtDetailItem,
  EmployeeDebtDetailParams,
  EmployeeDebtListParams,
  EmployeeDebtListResult,
  EmployeeDebtPaymentItem,
  EmployeeDebtPaymentListParams,
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

export async function getEmployeeDebtDetail(
  params: EmployeeDebtDetailParams,
): Promise<PagedListResult<EmployeeDebtDetailItem>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<EmployeeDebtDetailItem>>>('/employee-debt/detail', {
    params,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getEmployeeDebtPayments(
  params: EmployeeDebtPaymentListParams,
): Promise<PagedListResult<EmployeeDebtPaymentItem>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<EmployeeDebtPaymentItem>>>('/employee-debt/payments', {
    params,
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createManualEmployeeDebt(dto: CreateManualEmployeeDebtDto): Promise<unknown> {
  const response = await apiClient.post<ApiResponse<unknown>>('/employee-debt/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function cancelManualEmployeeDebt(debtId: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/disable/${debtId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function voidEmployeeDebtPayment(paymentId: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/payment/disable/${paymentId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
