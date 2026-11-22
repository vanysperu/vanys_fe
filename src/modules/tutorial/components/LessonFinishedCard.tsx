import { motion } from 'framer-motion';
import { PartyPopper } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useLessonProgress } from '@/modules/tutorial/hooks/useTutorial';
import { useStartLesson } from '@/modules/tutorial/hooks/useStartLesson';
import { useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import { findLesson, lessonsFor } from '@/modules/tutorial/lessons';
import { Button } from '@/presentation/components/shared/ui/button';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

// Felicitación al terminar una lección, con la siguiente sugerida (la primera
// del curso que todavía no completó).
export function LessonFinishedCard({ code }: { code: string }) {
  const navigate = useNavigate();
  const dismiss = useTutorialStore((state) => state.dismissFinished);
  const { data: access } = useAccess();
  const { data: progress } = useLessonProgress();
  const { startLesson, isPreparing } = useStartLesson();
  const lesson = findLesson(code);
  const completed = new Set([...(progress ?? []).filter((row) => row.status === 'completed').map((row) => row.lesson_code), code]);
  const next = lessonsFor(access).find((candidate) => !completed.has(candidate.code));

  const goToLessons = () => {
    dismiss();
    navigate('/aprender');
  };

  return createPortal(
    // pointer-events-auto: con una ventana del sistema abierta, Radix deja el
    // <body> sin clics y esta tarjeta los heredaría.
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" data-testid="tutorial-finished">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-sm rounded-2xl border bg-popover p-6 text-center text-popover-foreground shadow-2xl"
      >
        <motion.div
          className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-brand-orange/15"
          animate={{ rotate: [0, -12, 12, -6, 6, 0] }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <PartyPopper className="size-7 text-brand-orange-deep" />
        </motion.div>
        <h2 className="text-lg font-semibold">¡Lección completada!</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lesson?.title}</p>
        <div className="mt-5 flex flex-col gap-2">
          {next && (
            <Button
              type="button"
              disabled={isPreparing}
              onClick={() => {
                // Primero a "Aprender": así ninguna ventana de la lección anterior
                // queda abierta tapando el menú de la siguiente.
                dismiss();
                navigate('/aprender');
                void startLesson(next);
              }}
            >
              Siguiente: {next.title}
            </Button>
          )}
          <Button type="button" variant={next ? 'outline' : 'default'} onClick={goToLessons}>
            Ver todas las lecciones
          </Button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
