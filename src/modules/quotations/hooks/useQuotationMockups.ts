import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  disableQuotationMockup,
  getQuotationMockupFile,
  listQuotationMockups,
  uploadQuotationMockup,
} from '@/modules/quotations/api/mockups.api';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import type { UploadMockupInput } from '@/modules/quotations/types/mockup.types';

// Diseños de la cotización: solo con la pestaña "Diseños" abierta (enabled).
export function useQuotationMockups(quotationId: number, enabled: boolean) {
  return useQuery({
    queryKey: quotationsKeys.mockups(quotationId),
    queryFn: () => listQuotationMockups(quotationId),
    enabled,
  });
}

// El archivo de un diseño no cambia nunca: se pide una vez y queda en caché.
export function useQuotationMockupFile(mockupId: number) {
  return useQuery({
    queryKey: quotationsKeys.mockupFile(mockupId),
    queryFn: () => getQuotationMockupFile(mockupId),
    staleTime: Infinity,
    // Fijo: no se vuelve a pedir al navegar por el menú (AppSidebar, 27-nov).
    meta: { keepOnNavigate: true },
    gcTime: 10 * 60_000,
  });
}

// Subir/quitar refresca la lista y el detalle (deja un evento en el historial).
export function useUploadQuotationMockup(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadMockupInput) => uploadQuotationMockup(quotationId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.mockups(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}

export function useDisableQuotationMockup(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mockupId: number) => disableQuotationMockup(mockupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotationsKeys.mockups(quotationId) });
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId) });
    },
  });
}
