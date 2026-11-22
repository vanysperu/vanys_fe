import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';
import type {
  LessonPreparation,
  LessonProgress,
  PracticeSession,
  PreparedLesson,
  SaveProgressDto,
  TeamProgressParams,
  TeamProgressResult,
} from '@/modules/tutorial/types/tutorial.types';

// Modo enseñanza (21-nov). Cada función devuelve `data` ya desempaquetado.
function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) throw response.data;
  return response.data.data;
}

// Entra a la empresa de práctica: devuelve la sesión del usuario de práctica.
export const startPractice = async (): Promise<PracticeSession> =>
  unwrap(await apiClient.post<ApiResponse<PracticeSession>>('/tutorial/practice/start'));

// Deja la empresa de práctica como nueva (ejemplos de fábrica).
export const resetPractice = async (): Promise<PracticeSession> =>
  unwrap(await apiClient.post<ApiResponse<PracticeSession>>('/tutorial/practice/reset'));

export const getLessonProgress = async (): Promise<LessonProgress[]> =>
  unwrap(await apiClient.get<ApiResponse<LessonProgress[]>>('/tutorial/progress'));

export const saveLessonProgress = async (code: string, dto: SaveProgressDto): Promise<LessonProgress> =>
  unwrap(await apiClient.put<ApiResponse<LessonProgress>>(`/tutorial/progress/${code}`, dto));

// Datos de práctica que necesita una lección (ej. una cotización pendiente).
export const prepareLesson = async (preparation: LessonPreparation): Promise<PreparedLesson> =>
  unwrap(await apiClient.post<ApiResponse<PreparedLesson>>('/tutorial/practice/prepare', { preparation }));

export const getTeamProgress = async (params: TeamProgressParams): Promise<TeamProgressResult> =>
  unwrap(await apiClient.get<ApiResponse<TeamProgressResult>>('/tutorial/team-progress', { params }));
