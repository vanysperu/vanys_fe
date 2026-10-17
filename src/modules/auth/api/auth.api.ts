import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { MyAccess } from '@/presentation/hooks/shared/useAccess';

export interface LoginDto {
  email: string;
  password: string;
}

// Espejo de ValidateSignInResponse (grulla_be: auth.controller.ts).
export interface LoginResult {
  UserId: number;
  Username: string;
  FullName: string;
  Email: string;
  Jwt: string;
  MustChangePassword: boolean;
}

export async function login(dto: LoginDto): Promise<LoginResult> {
  const response = await apiClient.post<ApiResponse<LoginResult>>('/signin', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post<ApiResponse<unknown>>('/signout');
}

export async function getMyAccess(): Promise<MyAccess> {
  const response = await apiClient.get<ApiResponse<MyAccess>>('/access/me');
  if (!response.data.success) throw response.data;
  return response.data.data;
}
