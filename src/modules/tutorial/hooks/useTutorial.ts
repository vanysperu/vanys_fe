import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getLessonProgress,
  getTeamProgress,
  prepareLesson,
  resetPractice,
  saveLessonProgress,
  startPractice,
} from '@/modules/tutorial/api/tutorial.api';
import { tutorialKeys } from '@/modules/tutorial/hooks/tutorial.keys';
import type { SaveProgressDto, TeamProgressParams } from '@/modules/tutorial/types/tutorial.types';

// Avance de las lecciones de la persona (en la práctica, el de su cuenta real).
export function useLessonProgress() {
  return useQuery({ queryKey: tutorialKeys.progress(), queryFn: getLessonProgress, staleTime: 30_000 });
}

export function useSaveLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ code, dto }: { code: string; dto: SaveProgressDto }) => saveLessonProgress(code, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tutorialKeys.progress() });
    },
  });
}

export function useStartPractice() {
  return useMutation({ mutationFn: startPractice });
}

export function useResetPractice() {
  return useMutation({ mutationFn: resetPractice });
}

export function usePrepareLesson() {
  return useMutation({ mutationFn: prepareLesson });
}

// Avance del equipo (solo administradores).
export function useTeamProgress(params: TeamProgressParams, enabled: boolean) {
  return useQuery({
    queryKey: tutorialKeys.team(params),
    queryFn: () => getTeamProgress(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}
