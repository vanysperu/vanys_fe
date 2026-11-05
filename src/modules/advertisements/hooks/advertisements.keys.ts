import type { AdvertisementListParams } from '@/modules/advertisements/types/advertisement.types';

export const advertisementsKeys = {
  all: ['advertisements'] as const,
  lists: () => [...advertisementsKeys.all, 'list'] as const,
  list: (params: AdvertisementListParams) => [...advertisementsKeys.lists(), params] as const,
};
