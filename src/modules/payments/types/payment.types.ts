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
  // Cuenta a la que entró el pago (null = efectivo).
  payment_account_id: number | null;
  payment_account_name: string | null;
  is_deleted: boolean;
  business_unit_id: number | null;
  created_at: string;
}

export type PaymentListResult = PagedListResult<PaymentListItem>;

// "active" (por defecto en el backend) = vigentes; "disabled" = anulados.
export type PaymentStatusFilter = 'active' | 'disabled' | 'all';

export interface PaymentListParams {
  page?: number;
  limit?: number;
  quotationId?: number;
  method?: string;
  // Id de la cuenta, o "cash" para los pagos en efectivo.
  paymentAccountId?: number | 'cash';
  clientName?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: PaymentStatusFilter;
}

export interface UpdatePaymentDto {
  amount: number;
  method: string;
  paid_at: string;
  notes?: string;
  operation_number?: string;
  payment_account_id?: number | null;
}
