import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from '@/modules/dispatchGuides/api/dispatchGuides.api';
import { dispatchGuidesKeys } from '@/modules/dispatchGuides/hooks/dispatchGuides.keys';
import type { CatalogListParams, GuideListParams } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { inventoryKeys } from '@/modules/inventory/hooks/useInventory';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';

// ---------------------------------------------------------------- guías
export function useGuides(params: GuideListParams) {
  return useQuery({ queryKey: dispatchGuidesKeys.list(params), queryFn: () => api.getGuides(params), placeholderData: keepPreviousData });
}

export function useGuide(id: number | null) {
  return useQuery({ queryKey: dispatchGuidesKeys.detail(id ?? 0), queryFn: () => api.getGuide(id as number), enabled: id !== null });
}

export function useGuidePrefill(source: { quotationId?: number; transferId?: number } | null) {
  return useQuery({
    queryKey: dispatchGuidesKeys.prefill(source ?? {}),
    queryFn: () => api.getGuidePrefill(source ?? {}),
    enabled: source !== null,
    // Se arma una vez al abrir el formulario: no se re-pide al volver a la pestaña.
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useGuidePdf(id: number | null) {
  return useQuery({ queryKey: dispatchGuidesKeys.pdf(id ?? 0), queryFn: () => api.getGuidePdf(id as number), enabled: id !== null, staleTime: 5 * 60 * 1000 });
}

// Una guía cambia sus listas y su detalle; registrarla o anularla mueve además
// el stock (D4) y el historial de la cotización.
const useInvalidateGuides = () => {
  const queryClient = useQueryClient();
  return (guideId?: number) => {
    queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.lists() });
    if (guideId) {
      queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.detail(guideId) });
      queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.pdf(guideId) });
    }
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    queryClient.invalidateQueries({ queryKey: [...quotationsKeys.all, 'detail'] });
  };
};

export function useCreateGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.createGuide, onSuccess: (guide) => invalidate(guide.id) });
}

export function useUpdateGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.updateGuide, onSuccess: (guide) => invalidate(guide.id) });
}

export function useRegisterGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.registerGuide, onSuccess: (guide) => invalidate(guide.id) });
}

export function useUploadGuidePdf() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.uploadGuidePdf, onSuccess: (guide) => invalidate(guide.id) });
}

export function useDiscardGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.discardGuide, onSuccess: (guide) => invalidate(guide.id) });
}

export function useVoidGuide() {
  const invalidate = useInvalidateGuides();
  return useMutation({ mutationFn: api.voidGuide, onSuccess: (guide) => invalidate(guide.id) });
}

// ------------------------------------------------------------- catálogos
export function useCarriers(searchTerm: string, companyId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dispatchGuidesKeys.carriers(searchTerm, companyId),
    queryFn: () => api.getCarriers({ searchTerm: searchTerm || undefined, companyId }),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useVehicles(params: CatalogListParams, options?: { enabled?: boolean }) {
  return useQuery({ queryKey: dispatchGuidesKeys.vehicleList(params), queryFn: () => api.getVehicles(params), enabled: options?.enabled, placeholderData: keepPreviousData });
}

export function useDrivers(params: CatalogListParams, options?: { enabled?: boolean }) {
  return useQuery({ queryKey: dispatchGuidesKeys.driverList(params), queryFn: () => api.getDrivers(params), enabled: options?.enabled, placeholderData: keepPreviousData });
}

export function useSaveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id?: number; dto: Parameters<typeof api.createVehicle>[0] }) => (id ? api.updateVehicle({ id, dto }) : api.createVehicle(dto)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.vehicles() }),
  });
}

export function useToggleVehicleStatus() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: api.toggleVehicleStatus, onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.vehicles() }) });
}

export function useSaveDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id?: number; dto: Parameters<typeof api.createDriver>[0] }) => (id ? api.updateDriver({ id, dto }) : api.createDriver(dto)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.drivers() }),
  });
}

export function useToggleDriverStatus() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: api.toggleDriverStatus, onSuccess: () => queryClient.invalidateQueries({ queryKey: dispatchGuidesKeys.drivers() }) });
}
