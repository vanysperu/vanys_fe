import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';

// Espejo de grulla_be: auth/services/password_link (Sprint 2, ítem 4).
export type PasswordLinkPurpose = 'reset' | 'invite';
export type PasswordLinkState = 'valid' | 'expired' | 'used' | 'invalid';

export interface PasswordLinkCheck {
  state: PasswordLinkState;
  purpose: PasswordLinkPurpose | null;
  recipientName: string | null;
}

// "¿Olvidaste tu contraseña?": el backend responde lo mismo exista o no el
// correo (no revela qué correos están registrados). Devuelve ese mensaje.
export async function requestPasswordReset(email: string): Promise<string> {
  const response = await apiClient.post<ApiResponse<null>>('/password/forgot', { email });
  if (!response.data.success) throw response.data;
  return response.data.message ?? '';
}

// El token viaja en el cuerpo (POST), nunca en la URL de la API: así no
// queda en los logs de acceso del servidor.
export async function checkPasswordLink(token: string): Promise<PasswordLinkCheck> {
  const response = await apiClient.post<ApiResponse<PasswordLinkCheck>>('/password/link/check', { token });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function completePasswordLink(dto: { token: string; password: string }): Promise<string> {
  const response = await apiClient.post<ApiResponse<{ purpose: PasswordLinkPurpose }>>('/password/link/complete', dto);
  if (!response.data.success) throw response.data;
  return response.data.message ?? '';
}
