import { useMutation } from '@tanstack/react-query';

import { sendPasswordLink } from '@/modules/users/api/users.api';
import type { PasswordLinkPurpose } from '@/modules/users/types/createUser.types';

// Reenviar invitación / enviar enlace para restablecer. No cambia el listado
// (no hay columna que mostrar), así que no invalida nada.
export function useSendPasswordLink() {
  return useMutation({
    mutationFn: ({ id, purpose }: { id: number; purpose: PasswordLinkPurpose }) => sendPasswordLink(id, purpose),
  });
}
