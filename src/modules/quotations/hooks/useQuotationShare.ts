import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getPublicLink,
  getPublicQuotation,
  logWhatsappShare,
  regeneratePublicLink,
  sendQuotationEmail,
  setPublicLinkEnabled,
} from '@/modules/quotations/api/share.api';
import { publicQuotationKeys, quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';
import type { PublicLink, SendQuotationEmailDto } from '@/modules/quotations/types/share.types';

// Compartir la cotización (Sprint 2, ítem 7): un hook por operación.

// Enlace para compartir (se crea la primera vez). Solo cuando el diálogo está abierto.
export function usePublicLink(quotationId: number, enabled: boolean) {
  return useQuery({
    queryKey: quotationsKeys.publicLink(quotationId),
    queryFn: () => getPublicLink(quotationId),
    enabled,
    staleTime: 30_000,
  });
}

// Prender/apagar el enlace o generar uno nuevo: se actualiza el enlace en
// caché y el detalle (el historial suma un evento).
function useLinkMutation<TVariables>(quotationId: number, mutationFn: (variables: TVariables) => Promise<PublicLink>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (link) => {
      queryClient.setQueryData(quotationsKeys.publicLink(quotationId), link);
      queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId), exact: true });
    },
  });
}

export function useSetPublicLinkEnabled(quotationId: number) {
  return useLinkMutation(quotationId, (enabled: boolean) => setPublicLinkEnabled(quotationId, enabled));
}

export function useRegeneratePublicLink(quotationId: number) {
  return useLinkMutation(quotationId, () => regeneratePublicLink(quotationId));
}

export function useLogWhatsappShare(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (phone: string | null) => logWhatsappShare(quotationId, phone),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId), exact: true }),
  });
}

export function useSendQuotationEmail(quotationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: SendQuotationEmailDto) => sendQuotationEmail(quotationId, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: quotationsKeys.detail(quotationId), exact: true }),
  });
}

// Vista pública para el cliente. Sin reintentos: un enlace apagado no se
// arregla volviendo a preguntar.
export function usePublicQuotation(code: string) {
  return useQuery({
    queryKey: publicQuotationKeys.view(code),
    queryFn: () => getPublicQuotation(code),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });
}
