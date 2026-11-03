import { apiClient } from '@/config/apiClient';
import type { ReasonedToggleInput } from '@/modules/cashClosings/types/cashClosings.types';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CorrectManualDebtDto,
  CorrectReimbursementDto,
  CreateManualEmployeeDebtDto,
  EmployeeDebtPaymentRecord,
  EmployeeDebtRecord,
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

export async function voidEmployeeDebtPayment({ id, reason }: ReasonedToggleInput): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/payment/disable/${id}`, reason ? { reason } : undefined);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getEmployeeDebtById(debtId: number): Promise<EmployeeDebtRecord> {
  const response = await apiClient.get<ApiResponse<EmployeeDebtRecord>>(`/employee-debt/find/${debtId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getEmployeeDebtPaymentById(paymentId: number): Promise<EmployeeDebtPaymentRecord> {
  const response = await apiClient.get<ApiResponse<EmployeeDebtPaymentRecord>>(`/employee-debt/payment/find/${paymentId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function correctManualEmployeeDebt({ id, dto }: { id: number; dto: CorrectManualDebtDto }): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function correctEmployeeDebtPayment({ id, dto }: { id: number; dto: CorrectReimbursementDto }): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/employee-debt/payment/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// URLs de historial (las consume CorrectionHistoryDialog del kit de correcciones).
export const employeeDebtCorrectionsUrl = (debtId: number) => `/employee-debt/${debtId}/corrections`;
export const employeeDebtPaymentCorrectionsUrl = (paymentId: number) => `/employee-debt/payment/${paymentId}/corrections`;
