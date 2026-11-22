import type { TeamProgressParams } from '@/modules/tutorial/types/tutorial.types';

export const tutorialKeys = {
  all: ['tutorial'] as const,
  progress: () => [...tutorialKeys.all, 'progress'] as const,
  teams: () => [...tutorialKeys.all, 'team'] as const,
  team: (params: TeamProgressParams) => [...tutorialKeys.teams(), params] as const,
};
