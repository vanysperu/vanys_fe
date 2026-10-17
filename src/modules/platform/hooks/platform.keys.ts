import type { BusinessUnitListParams, CompanyListParams } from '@/modules/platform/types/platform.types';

export const companiesKeys = {
  all: ['companies'] as const,
  lists: () => [...companiesKeys.all, 'list'] as const,
  list: (params: CompanyListParams) => [...companiesKeys.lists(), params] as const,
};

export const businessUnitsKeys = {
  all: ['business-units'] as const,
  lists: () => [...businessUnitsKeys.all, 'list'] as const,
  list: (params: BusinessUnitListParams) => [...businessUnitsKeys.lists(), params] as const,
};

export const themesKeys = {
  all: ['themes'] as const,
};
