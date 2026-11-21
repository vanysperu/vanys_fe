import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CreateLoanPaymentDto,
  Loan,
  LoanDetail,
  LoanListParams,
  LoanListResult,
  SaveLoanDto,
} from '@/modules/loans/types/loan.types';

// Préstamos a personas (21-nov). Cada función devuelve `data` ya desempaquetado.
function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export const getLoans = async (params: LoanListParams): Promise<LoanListResult> =>
  unwrap(await apiClient.get<ApiResponse<LoanListResult>>('/loan/list', { params }));

export const getLoan = async (id: number): Promise<LoanDetail> => unwrap(await apiClient.get<ApiResponse<LoanDetail>>(`/loan/find/${id}`));

export const createLoan = async (dto: SaveLoanDto): Promise<Loan> => unwrap(await apiClient.post<ApiResponse<Loan>>('/loan/create', dto));

export const updateLoan = async (id: number, dto: SaveLoanDto): Promise<Loan> =>
  unwrap(await apiClient.put<ApiResponse<Loan>>(`/loan/update/${id}`, dto));

// Anula o restaura (el backend alterna).
export const toggleLoan = async (id: number): Promise<Loan> => unwrap(await apiClient.put<ApiResponse<Loan>>(`/loan/disable/${id}`));

export const createLoanPayment = async (id: number, dto: CreateLoanPaymentDto): Promise<Loan> =>
  unwrap(await apiClient.post<ApiResponse<Loan>>(`/loan/${id}/payment`, dto));

export const disableLoanPayment = async (paymentId: number): Promise<Loan> =>
  unwrap(await apiClient.put<ApiResponse<Loan>>(`/loan/payment/disable/${paymentId}`));
