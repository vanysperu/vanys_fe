import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCompanyFeatures, setCompanyFeatures } from '@/modules/platform/api/companyFeatures.api';

export const companyFeaturesKeys = {
  all: ['companyFeatures'] as const,
  detail: (companyId: number) => [...companyFeaturesKeys.all, companyId] as const,
};

export function useCompanyFeatures(companyId: number | undefined) {
  return useQuery({
    queryKey: companyFeaturesKeys.detail(companyId ?? 0),
    queryFn: () => getCompanyFeatures(companyId ?? 0),
    enabled: Boolean(companyId),
  });
}

export function useSetCompanyFeatures() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setCompanyFeatures,
    onSuccess: (features, { companyId }) => queryClient.setQueryData(companyFeaturesKeys.detail(companyId), features),
  });
}
