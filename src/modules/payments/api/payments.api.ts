import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { PaymentListParams, PaymentListResult, UpdatePaymentDto } from '@/modules/payments/types/payment.types';

export async function getPayments(params: PaymentListParams): Promise<PaymentListResult> {
  const response = await apiClient.get<ApiResponse<PaymentListResult>>('/payment/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updatePayment(id: number, dto: UpdatePaymentDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/payment/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function togglePaymentStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/payment/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
