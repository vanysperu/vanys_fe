import type { ApiKeyListParams } from '@/modules/apiKeys/types/apiKey.types';

export const apiKeysKeys = {
  all: ['api-keys'] as const,
  lists: () => [...apiKeysKeys.all, 'list'] as const,
  list: (params: ApiKeyListParams) => [...apiKeysKeys.lists(), params] as const,
};
