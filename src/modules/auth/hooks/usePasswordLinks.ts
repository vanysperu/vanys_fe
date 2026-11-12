import { useMutation, useQuery } from '@tanstack/react-query';

import { checkPasswordLink, completePasswordLink, requestPasswordReset } from '@/modules/auth/api/password.api';

export const passwordLinkKeys = {
  all: ['password-link'] as const,
  check: (token: string) => [...passwordLinkKeys.all, 'check', token] as const,
};

// "¿Olvidaste tu contraseña?" → manda el enlace al correo.
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset });
}

// Estado del enlace antes de mostrar el formulario. Sin reintentos ni
// recargas: un enlace vencido no se arregla volviendo a preguntar.
export function usePasswordLinkCheck(token: string) {
  return useQuery({
    queryKey: passwordLinkKeys.check(token),
    queryFn: () => checkPasswordLink(token),
    enabled: token.length > 0,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

// Fija la contraseña con el enlace (invitación o recuperación).
export function useCompletePasswordLink() {
  return useMutation({ mutationFn: completePasswordLink });
}
