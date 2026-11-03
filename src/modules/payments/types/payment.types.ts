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
  // Cuántas correcciones tiene el pago (badge "Corregido" + historial).
  corrections_count: number;
  created_at: string;
}

// Espejo de PaymentDetail (GET /payment/find/:id): el pago con lo que necesita
// el diálogo de corrección.
export interface PaymentDetail {
  id: number;
  quotation_id: number;
  company_id: number;
  business_unit_id: number | null;
  client_name: string;
  amount: number;
  method: string | null;
  paid_at: string;
  notes: string | null;
  operation_number: string | null;
  payment_account_id: number | null;
  payment_account_name: string | null;
  is_deleted: boolean;
  // Total de la cotización y lo cobrado SIN contar este pago: con ellos se
  // calcula el tope del nuevo monto.
  quotation_total: number;
  paid_by_others: number;
  corrections_count: number;
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

// Corrección de un pago (PUT /payment/update/:id): cuerpo completo + motivo.
export interface UpdatePaymentDto {
  amount: number;
  method: string;
  paid_at: string;
  notes?: string;
  operation_number?: string;
  payment_account_id?: number | null;
  reason: string;
}
