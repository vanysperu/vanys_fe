import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { usePrepareLesson } from '@/modules/tutorial/hooks/useTutorial';
import { useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import type { TutorialLesson } from '@/modules/tutorial/types/tutorial.types';

// Arranca una lección dentro de la práctica: si necesita datos (ej. una
// cotización pendiente), primero los pide al backend.
export function useStartLesson() {
  const start = useTutorialStore((state) => state.start);
  const { mutateAsync: prepare, isPending } = usePrepareLesson();

  const startLesson = async (lesson: TutorialLesson) => {
    if (!lesson.prepare) {
      start(lesson.code, { quotationId: null });
      return;
    }
    try {
      const prepared = await prepare(lesson.prepare);
      start(lesson.code, { quotationId: prepared.quotation_id });
    } catch (error) {
      toast.error((error as ApiClientError).message ?? 'No se pudo preparar la lección');
    }
  };

  return { startLesson, isPreparing: isPending };
}
