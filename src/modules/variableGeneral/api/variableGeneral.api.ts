import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  CreateVariableGeneralDto,
  UpdateVariableGeneralDto,
  VariableGeneral,
  VariableGeneralListParams,
  VariableGeneralListResult,
} from '@/modules/variableGeneral/types/variableGeneral.types';

export async function getVariableGenerals(params: VariableGeneralListParams): Promise<VariableGeneralListResult> {
  const response = await apiClient.get<ApiResponse<VariableGeneralListResult>>('/variable_general/list', {
    params: { ...params, admin: true },
  });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function createVariableGeneral(dto: CreateVariableGeneralDto): Promise<VariableGeneral> {
  const response = await apiClient.post<ApiResponse<VariableGeneral>>('/variable_general/create', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function updateVariableGeneral(id: number, dto: UpdateVariableGeneralDto): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/variable_general/update/${id}`, dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function deleteVariableGeneral(id: number): Promise<unknown> {
  const response = await apiClient.delete<ApiResponse<unknown>>(`/variable_general/delete/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Deshabilita/habilita (toggle, soft-delete) - reemplaza al DELETE físico
// en la pantalla de administración (CLAUDE.md sección 1).
export async function toggleVariableGeneralStatus(id: number): Promise<unknown> {
  const response = await apiClient.put<ApiResponse<unknown>>(`/variable_general/disable/${id}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}
