import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';

// Espejo de grulla_be company_feature (Sprint 2, base común).
export interface CompanyFeature {
  code: string;
  label: string;
  description: string;
  enabled: boolean;
}

export async function getCompanyFeatures(companyId: number): Promise<CompanyFeature[]> {
  const response = await apiClient.get<ApiResponse<CompanyFeature[]>>(`/company-feature/${companyId}`);
  if (!response.data.success) throw response.data;
  return response.data.data;
}

export async function setCompanyFeatures({
  companyId,
  features,
}: {
  companyId: number;
  features: Record<string, boolean>;
}): Promise<CompanyFeature[]> {
  const response = await apiClient.put<ApiResponse<CompanyFeature[]>>(`/company-feature/${companyId}`, { features });
  if (!response.data.success) throw response.data;
  return response.data.data;
}
