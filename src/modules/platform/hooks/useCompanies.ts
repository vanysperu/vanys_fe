import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createCompany, getCompanies, getThemes, toggleCompanyStatus, updateCompany } from '@/modules/platform/api/companies.api';
import { companiesKeys, themesKeys } from '@/modules/platform/hooks/platform.keys';
import type { CompanyListParams, UpdateCompanyDto } from '@/modules/platform/types/platform.types';

export function useCompanies(params: CompanyListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: companiesKeys.list(params),
    queryFn: () => getCompanies(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCompanyDto }) => updateCompany(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useToggleCompanyStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleCompanyStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useThemes() {
  return useQuery({
    queryKey: themesKeys.all,
    queryFn: getThemes,
    staleTime: 10 * 60 * 1000,
  });
}
