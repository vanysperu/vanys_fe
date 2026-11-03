import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createApiKey, getApiKeys, revokeApiKey, updateApiKey } from '@/modules/apiKeys/api/apiKeys.api';
import { apiKeysKeys } from '@/modules/apiKeys/hooks/apiKeys.keys';
import type { ApiKeyListParams, UpdateApiKeyDto } from '@/modules/apiKeys/types/apiKey.types';

export function useApiKeys(params: ApiKeyListParams) {
  return useQuery({
    queryKey: apiKeysKeys.list(params),
    queryFn: () => getApiKeys(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysKeys.lists() }),
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateApiKeyDto }) => updateApiKey(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysKeys.lists() }),
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: apiKeysKeys.lists() }),
  });
}
