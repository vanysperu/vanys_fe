import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createTechnique, getTechniques, toggleTechniqueStatus, updateTechnique } from '@/modules/products/api/techniques.api';
import { techniquesKeys } from '@/modules/products/hooks/products.keys';
import type { CatalogListParams, UpdateTechniqueDto } from '@/modules/products/types/product.types';

export function useTechniques(params: CatalogListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: techniquesKeys.list(params),
    queryFn: () => getTechniques(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateTechnique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTechnique,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: techniquesKeys.lists() }),
  });
}

export function useUpdateTechnique() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateTechniqueDto }) => updateTechnique(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: techniquesKeys.lists() }),
  });
}

export function useToggleTechniqueStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleTechniqueStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: techniquesKeys.lists() }),
  });
}
