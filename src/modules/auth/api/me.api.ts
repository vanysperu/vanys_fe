import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export async function changeMyPassword(dto: ChangePasswordDto): Promise<void> {
  const response = await apiClient.patch<ApiResponse<unknown>>('/user/change/password', dto);
  if (!response.data.success) throw response.data;
}
