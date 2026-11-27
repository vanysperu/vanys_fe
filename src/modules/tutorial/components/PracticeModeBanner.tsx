import { BookOpen, GraduationCap, LogOut, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { enterPracticeSession, leavePracticeSession } from '@/modules/tutorial/engine/practiceSession';
import { useResetPractice } from '@/modules/tutorial/hooks/useTutorial';
import { useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';

// Franja fija mientras se practica: deja claro que nada toca los datos reales
// y da las tres salidas (lecciones, reiniciar, volver a la cuenta real).
// Es una "salida de emergencia": sus botones funcionan aunque haya una lección
// en curso (el bloqueo del tutorial respeta data-tutorial-escape). Pedido del
// usuario, 26-nov: "no hay una manera de volver a la cuenta en modo normal".
export function PracticeModeBanner() {
  const [confirmReset, setConfirmReset] = useState(false);
  const stopLesson = useTutorialStore((state) => state.stop);
  const { mutate: resetPractice, isPending } = useResetPractice();

  const reset = () =>
    resetPractice(undefined, {
      onSuccess: (session) => {
        stopLesson();
        enterPracticeSession(session, { fromPractice: true });
      },
      onError: (error) => toast.error((error as ApiClientError).message ?? 'No se pudo reiniciar la práctica'),
    });

  return (
    // Fondo opaco debajo del naranja: la franja queda fija arriba y el contenido pasa por detrás.
    <div className="bg-background" data-tutorial-escape>
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-brand-orange/30 bg-brand-orange/10 px-4 py-2 text-sm"
        data-testid="practice-mode-banner"
      >
        <GraduationCap className="size-4 shrink-0 text-brand-orange-deep" />
        <p className="min-w-0 flex-1">
          <span className="font-semibold">Modo enseñanza.</span>{' '}
          <span className="hidden text-muted-foreground sm:inline">
            Estás en tu empresa de práctica: nada de lo que hagas aquí toca tus datos reales.
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Salir de la lección en curso al ir a la lista: si no, seguiría pidiendo su paso. */}
          <Button asChild size="sm" variant="ghost">
            <Link to="/aprender" onClick={stopLesson} aria-label="Lecciones">
              <BookOpen className="size-4" />
              <span className="hidden sm:inline">Lecciones</span>
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            aria-label="Reiniciar práctica"
            onClick={() => {
              // La confirmación se abre fuera de la franja: sin lección en curso, se puede tocar.
              stopLesson();
              setConfirmReset(true);
            }}
          >
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Reiniciar práctica</span>
          </Button>
          <Button type="button" size="sm" onClick={leavePracticeSession}>
            <LogOut className="size-4" />
            Volver a mi cuenta
          </Button>
        </div>
        <ConfirmDialog
          open={confirmReset}
          onOpenChange={setConfirmReset}
          title="¿Reiniciar la práctica?"
          description="Tu empresa de práctica vuelve a quedar como nueva, con los ejemplos de siempre. Tu avance en las lecciones se conserva."
          confirmLabel="Sí, reiniciar"
          onConfirm={() => {
            setConfirmReset(false);
            reset();
          }}
        />
      </div>
    </div>
  );
}
