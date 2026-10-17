import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createVariableGeneral,
  deleteVariableGeneral,
  getVariableGenerals,
  toggleVariableGeneralStatus,
  updateVariableGeneral,
} from '@/modules/variableGeneral/api/variableGeneral.api';
import type { UpdateVariableGeneralDto } from '@/modules/variableGeneral/types/variableGeneral.types';
import { variableGeneralKeys } from '@/modules/variableGeneral/hooks/variableGeneral.keys';
import type { VariableGeneralListParams } from '@/modules/variableGeneral/types/variableGeneral.types';

export function useVariableGenerals(params: VariableGeneralListParams) {
  return useQuery({
    queryKey: variableGeneralKeys.list(params),
    queryFn: () => getVariableGenerals(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateVariableGeneral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVariableGeneral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variableGeneralKeys.lists() });
    },
  });
}

export function useUpdateVariableGeneral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateVariableGeneralDto }) => updateVariableGeneral(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variableGeneralKeys.lists() });
    },
  });
}

export function useDeleteVariableGeneral() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVariableGeneral,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variableGeneralKeys.lists() });
    },
  });
}

// Sigue la misma convención de nombre/forma que useToggleClientStatus /
// useToggleProductStatus (CLAUDE.md sección 7: mismo patrón entre módulos).
export function useToggleVariableGeneralStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleVariableGeneralStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variableGeneralKeys.lists() });
    },
  });
}
