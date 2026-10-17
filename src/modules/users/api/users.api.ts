import { apiClient } from '@/config/apiClient';
import type { ApiResponse, PagedListResult } from '@/config/api.types';
import type {
  CatalogOption,
  CreateUserDto,
  CreateUserResult,
  UpdateUserDto,
} from '@/modules/users/types/createUser.types';
import type { User, UsersListParams } from '@/modules/users/types/user.types';

export async function getUsers(params: UsersListParams): Promise<PagedListResult<User>> {
  const response = await apiClient.get<ApiResponse<PagedListResult<User>>>('/user/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createUser(dto: CreateUserDto): Promise<CreateUserResult> {
  const response = await apiClient.post<ApiResponse<CreateUserResult>>('/user/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateUser(id: number, dto: UpdateUserDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/user/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Catálogos globales usados por el formulario de crear/editar usuario
// (grulla_be: general_variable, categorías "document_type"/"gender").
export async function getCatalog(category: 'document_type' | 'gender'): Promise<CatalogOption[]> {
  const response = await apiClient.get<ApiResponse<CatalogOption[]>>('/variable_general/list', {
    params: { category, ignorePagination: true },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export interface ToggleUserResult {
  status: boolean;
}

// El endpoint alterna estado (habilitar/deshabilitar) sobre el mismo recurso.
export async function toggleUserStatus(id: number): Promise<ToggleUserResult> {
  const response = await apiClient.put<ApiResponse<ToggleUserResult>>(`/user/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
