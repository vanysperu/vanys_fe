import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAdvertisement,
  deleteAdvertisement,
  getAdvertisements,
  moveAdvertisement,
  setAdvertisementActive,
  updateAdvertisement,
  uploadAdvertisementImage,
} from '@/modules/advertisements/api/advertisements.api';
import { advertisementsKeys } from '@/modules/advertisements/hooks/advertisements.keys';
import {
  ADVERTISEMENT_ZONE_CATEGORY,
  type AdvertisementListParams,
  type UpdateAdvertisementDto,
} from '@/modules/advertisements/types/advertisement.types';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';

export function useAdvertisements(params: AdvertisementListParams) {
  return useQuery({
    queryKey: advertisementsKeys.list(params),
    queryFn: () => getAdvertisements(params),
    placeholderData: keepPreviousData,
  });
}

// Zonas que puede usar la empresa (las suyas y las globales). `activeOnly`
// false también trae las deshabilitadas (para el filtro de la lista).
export function useAdvertisementZones(companyId: number | undefined, activeOnly = true) {
  return useVariableGenerals({
    category: ADVERTISEMENT_ZONE_CATEGORY,
    ignorePagination: true,
    status: activeOnly ? 'active' : undefined,
    companyId,
  });
}

// Mover o eliminar cambia la posición de otros anuncios: se refresca la lista.
function useInvalidateAdvertisements() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: advertisementsKeys.lists() });
}

export function useCreateAdvertisement() {
  const invalidate = useInvalidateAdvertisements();
  return useMutation({ mutationFn: createAdvertisement, onSuccess: invalidate });
}

export function useUpdateAdvertisement() {
  const invalidate = useInvalidateAdvertisements();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateAdvertisementDto }) => updateAdvertisement(id, dto),
    onSuccess: invalidate,
  });
}

export function useMoveAdvertisement() {
  const invalidate = useInvalidateAdvertisements();
  return useMutation({
    mutationFn: ({ id, position }: { id: number; position: number }) => moveAdvertisement(id, position),
    onSuccess: invalidate,
  });
}

export function useToggleAdvertisementStatus() {
  const invalidate = useInvalidateAdvertisements();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => setAdvertisementActive(id, isActive),
    onSuccess: invalidate,
  });
}

export function useDeleteAdvertisement() {
  const invalidate = useInvalidateAdvertisements();
  return useMutation({ mutationFn: deleteAdvertisement, onSuccess: invalidate });
}

export function useUploadAdvertisementImage() {
  return useMutation({ mutationFn: uploadAdvertisementImage });
}
