import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getWorkflowBoard, getWorkflowConfig, saveWorkflowConfig } from '@/modules/productionWorkflow/api/productionWorkflow.api';
import { productionWorkflowKeys } from '@/modules/productionWorkflow/hooks/productionWorkflow.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';

// Las columnas cambian muy rara vez: no hace falta pedirlas cada vez que se
// abre una cotización.
const BOARD_STALE_TIME_MS = 5 * 60 * 1000;

// companyId: solo para el Super Administrador; undefined = la del usuario.
export function useWorkflowConfig(companyId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: productionWorkflowKeys.config(companyId),
    queryFn: () => getWorkflowConfig(companyId),
    enabled: options?.enabled,
  });
}

export function useWorkflowBoard(companyId?: number) {
  return useQuery({
    queryKey: productionWorkflowKeys.board(companyId),
    queryFn: () => getWorkflowBoard(companyId),
    staleTime: BOARD_STALE_TIME_MS,
  });
}

// Al guardar se refrescan la configuración y los tableros (columnas nuevas,
// orden, reglas) y el detalle de las cotizaciones abiertas: los productos de
// una columna desactivada pasaron a otra.
export function useSaveWorkflowConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveWorkflowConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productionWorkflowKeys.all });
      queryClient.invalidateQueries({ queryKey: [...quotationsKeys.all, 'detail'] });
    },
  });
}
