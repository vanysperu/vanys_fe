import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getEmployeeDebts, payEmployeeDebt } from '@/modules/employeeDebts/api/employeeDebts.api';
import { employeeDebtsKeys } from '@/modules/employeeDebts/hooks/employeeDebts.keys';
import type { EmployeeDebtListParams } from '@/modules/employeeDebts/types/employeeDebt.types';
import { cashMovementsKeys } from '@/modules/cashMovements/hooks/cashMovements.keys';

export function useEmployeeDebts(params: EmployeeDebtListParams) {
  return useQuery({
    queryKey: employeeDebtsKeys.list(params),
    queryFn: () => getEmployeeDebts(params),
    placeholderData: keepPreviousData,
  });
}

export function usePayEmployeeDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payEmployeeDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeDebtsKeys.lists() });
      // En Caja, los gastos de esas compras pasan a "repuesto el ...".
      queryClient.invalidateQueries({ queryKey: cashMovementsKeys.lists() });
    },
  });
}
