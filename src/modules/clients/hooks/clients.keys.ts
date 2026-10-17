import type { ClientListParams } from '@/modules/clients/types/client.types';

export const clientsKeys = {
  all: ['clients'] as const,
  lists: () => [...clientsKeys.all, 'list'] as const,
  list: (params: ClientListParams) => [...clientsKeys.lists(), params] as const,
};
