import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type { SaveWorkflowConfigDto, WorkflowBoard, WorkflowConfig } from '@/modules/productionWorkflow/types/productionWorkflow.types';

// companyId: solo para el Super Administrador (la empresa elegida); para un
// usuario de empresa el backend siempre usa la suya.
export async function getWorkflowConfig(companyId?: number): Promise<WorkflowConfig> {
  const response = await apiClient.get<ApiResponse<WorkflowConfig>>('/production-workflow/config', { params: { companyId } });
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function saveWorkflowConfig(dto: SaveWorkflowConfigDto): Promise<WorkflowConfig> {
  const response = await apiClient.put<ApiResponse<WorkflowConfig>>('/production-workflow/config', dto);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function getWorkflowBoard(companyId?: number): Promise<WorkflowBoard> {
  const response = await apiClient.get<ApiResponse<WorkflowBoard>>('/production-workflow/board', { params: { companyId } });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
