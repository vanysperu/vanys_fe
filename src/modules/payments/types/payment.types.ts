import type { PagedListResult } from '@/config/api.types';

// Espejo de PaymentListItem (grulla_be: payment/services/find).
export interface PaymentListItem {
  id: number;
  quotation_id: number;
  client_name: string;
  amount: number;
  method: string | null;
  paid_at: string;
  notes: string | null;
  operation_number: string | null;
  is_deleted: boolean;
  business_unit_id: number | null;
  created_at: string;
}

export type PaymentListResult = PagedListResult<PaymentListItem>;

export interface PaymentListParams {
  page?: number;
  limit?: number;
  quotationId?: number;
  method?: string;
  dateFrom?: string;
  dateTo?: string;
  includeDisabled?: boolean;
}

export interface UpdatePaymentDto {
  amount: number;
  method: string;
  paid_at: string;
  notes?: string;
  operation_number?: string;
}
