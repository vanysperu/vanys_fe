import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createSupplier, getSuppliers, toggleSupplierStatus, updateSupplier } from '@/modules/suppliers/api/suppliers.api';
import { suppliersKeys } from '@/modules/suppliers/hooks/suppliers.keys';
import type { SaveSupplierDto, SupplierListParams } from '@/modules/suppliers/types/supplier.types';

export function useSuppliers(params: SupplierListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: suppliersKeys.list(params),
    queryFn: () => getSuppliers(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() }),
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: SaveSupplierDto }) => updateSupplier(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() }),
  });
}

export function useToggleSupplierStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleSupplierStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suppliersKeys.lists() }),
  });
}
