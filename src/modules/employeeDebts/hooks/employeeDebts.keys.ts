import type { EmployeeDebtListParams } from '@/modules/employeeDebts/types/employeeDebt.types';

export const employeeDebtsKeys = {
  all: ['employee-debts'] as const,
  lists: () => [...employeeDebtsKeys.all, 'list'] as const,
  list: (params: EmployeeDebtListParams) => [...employeeDebtsKeys.lists(), params] as const,
};
