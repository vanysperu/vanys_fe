import type {
  EmployeeDebtDetailParams,
  EmployeeDebtListParams,
  EmployeeDebtPaymentListParams,
} from '@/modules/employeeDebts/types/employeeDebt.types';

export const employeeDebtsKeys = {
  all: ['employee-debts'] as const,
  lists: () => [...employeeDebtsKeys.all, 'list'] as const,
  list: (params: EmployeeDebtListParams) => [...employeeDebtsKeys.lists(), params] as const,
  details: () => [...employeeDebtsKeys.all, 'detail'] as const,
  detail: (params: EmployeeDebtDetailParams) => [...employeeDebtsKeys.details(), params] as const,
  payments: () => [...employeeDebtsKeys.all, 'payments'] as const,
  paymentList: (params: EmployeeDebtPaymentListParams) => [...employeeDebtsKeys.payments(), params] as const,
};
