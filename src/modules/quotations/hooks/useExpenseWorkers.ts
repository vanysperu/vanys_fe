import { useUsers } from '@/modules/users/hooks/useUsers';
import type { ExpenseWorkerOption } from '@/modules/quotations/components/ExpenseFundingFields';
import { usePermission } from '@/presentation/hooks/shared/useAccess';

// Trabajadores activos que pueden haber puesto la plata de un gasto. Solo se
// piden al elegir "plata de un trabajador"; el backend revalida la empresa. Quien
// no tiene acceso a usuarios (un gestor) no los pide: el gasto queda a su nombre.
export function useExpenseWorkers(companyId: number | undefined, enabled: boolean): ExpenseWorkerOption[] {
  const canListUsers = usePermission('users');
  const { data } = useUsers({ limit: 100, isActive: true }, { enabled: enabled && canListUsers });
  return (data?.data ?? []).filter((user) => user.status && (companyId === undefined || user.company_id === companyId));
}
