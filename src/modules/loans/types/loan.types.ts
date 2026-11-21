// Préstamos a personas (pedido del usuario, 21-nov). Mismo shape que el
// backend (grulla_be: modules/loan/types/loan.types.ts).

export type LoanStatus = 'pending' | 'overdue' | 'paid' | 'annulled';

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  pending: 'Por cobrar',
  overdue: 'Vencido',
  paid: 'Pagado',
  annulled: 'Anulado',
};

export interface LocalDateTime {
  date: string;
  time: string;
}

export interface Loan {
  id: number;
  company_id: number;
  business_unit_id: number | null;
  borrower_name: string;
  borrower_document: string | null;
  borrower_phone: string | null;
  principal: number;
  interest_rate: number;
  interest_amount: number;
  total_due: number;
  paid_amount: number;
  paid_interest: number;
  payments_count: number;
  balance: number;
  status: LoanStatus;
  loaned_at: string;
  due_date: string | null;
  payment_account_id: number | null;
  payment_account_name: string | null;
  operation_number: string | null;
  notes: string | null;
  active: boolean;
  createdAt: LocalDateTime;
  created_by_name: string | null;
}

export interface LoanPayment {
  id: number;
  loan_id: number;
  amount: number;
  principal_part: number;
  interest_part: number;
  paid_at: string;
  payment_account_id: number | null;
  payment_account_name: string | null;
  operation_number: string | null;
  notes: string | null;
  active: boolean;
  createdAt: LocalDateTime;
  created_by_name: string | null;
}

export interface LoanDetail extends Loan {
  payments: LoanPayment[];
}

export interface LoanListParams {
  page: number;
  limit: number;
  status?: LoanStatus;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  companyId?: number;
}

export interface LoanListResult {
  data: Loan[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { outstanding_balance: number; interest_collected: number };
}

export interface SaveLoanDto {
  company_id?: number;
  business_unit_id?: number;
  borrower_name: string;
  borrower_document?: string | null;
  borrower_phone?: string | null;
  principal?: number;
  interest_rate?: number;
  loaned_at?: string;
  due_date?: string | null;
  payment_account_id?: number | null;
  operation_number?: string | null;
  notes?: string | null;
}

export interface CreateLoanPaymentDto {
  amount: number;
  paid_at: string;
  payment_account_id: number | null;
  operation_number?: string | null;
  notes?: string | null;
}
