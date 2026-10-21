import type { StatisticsParams } from '@/modules/statistics/types/statistics.types';

export const statisticsKeys = {
  all: ['statistics'] as const,
  overview: (params: StatisticsParams) => [...statisticsKeys.all, 'overview', params] as const,
};
