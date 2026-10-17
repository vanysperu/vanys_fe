import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createBusinessUnit,
  getBusinessUnits,
  toggleBusinessUnitStatus,
  updateBusinessUnit,
} from '@/modules/platform/api/businessUnits.api';
import { businessUnitsKeys } from '@/modules/platform/hooks/platform.keys';
import type { BusinessUnitListParams, UpdateBusinessUnitDto } from '@/modules/platform/types/platform.types';

export function useBusinessUnits(params: BusinessUnitListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: businessUnitsKeys.list(params),
    queryFn: () => getBusinessUnits(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

export function useCreateBusinessUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBusinessUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitsKeys.lists() });
    },
  });
}

export function useUpdateBusinessUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateBusinessUnitDto }) => updateBusinessUnit(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitsKeys.lists() });
    },
  });
}

export function useToggleBusinessUnitStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleBusinessUnitStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessUnitsKeys.lists() });
    },
  });
}
