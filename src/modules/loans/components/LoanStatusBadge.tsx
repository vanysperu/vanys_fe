import { LOAN_STATUS_LABEL, type LoanStatus } from '@/modules/loans/types/loan.types';
import { Badge } from '@/presentation/components/shared/ui/badge';

const VARIANT: Record<LoanStatus, 'default' | 'success' | 'warning' | 'muted'> = {
  pending: 'default',
  overdue: 'warning',
  paid: 'success',
  annulled: 'muted',
};

// Estado de un préstamo (lo calcula el backend: saldo, vencimiento, anulado).
export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return <Badge variant={VARIANT[status]}>{LOAN_STATUS_LABEL[status]}</Badge>;
}
