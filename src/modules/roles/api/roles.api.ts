import { apiClient } from '@/config/apiClient';
import type { ApiResponse, CountedListResult } from '@/config/api.types';
import type {
  CreateRoleDto,
  Role,
  RoleListParams,
  RoleResourceTree,
  SetRoleResourcesDto,
  UpdateRoleDto,
} from '@/modules/roles/types/role.types';

export async function getRoles(params: RoleListParams): Promise<CountedListResult<Role>> {
  const response = await apiClient.get<ApiResponse<CountedListResult<Role>>>('/role/list', { params });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createRole(dto: CreateRoleDto): Promise<Role> {
  const response = await apiClient.post<ApiResponse<Role>>('/role/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateRole(id: number, dto: UpdateRoleDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/role/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function toggleRoleStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/role/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getRoleResourceTree(roleId: number): Promise<RoleResourceTree> {
  const response = await apiClient.get<ApiResponse<RoleResourceTree>>(`/roles/${roleId}/resources`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function setRoleResources(roleId: number, dto: SetRoleResourcesDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/roles/${roleId}/resources`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
