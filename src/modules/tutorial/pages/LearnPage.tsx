import { CheckCircle2, Clock, GraduationCap, PlayCircle, RotateCcw, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDateTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { enterPracticeSession } from '@/modules/tutorial/engine/practiceSession';
import { useLessonProgress, useStartPractice, useTeamProgress } from '@/modules/tutorial/hooks/useTutorial';
import { useStartLesson } from '@/modules/tutorial/hooks/useStartLesson';
import { pendingLesson, useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import { LESSONS, lessonsFor } from '@/modules/tutorial/lessons';
import type { TeamMemberProgress, TutorialLesson } from '@/modules/tutorial/types/tutorial.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// "Aprender" (modo enseñanza, 21-nov). Desde la cuenta real: entrar a la
// práctica (y, para administradores, el avance del equipo). Desde la práctica:
// elegir y hacer las lecciones.
export function LearnPage() {
  const { data: access, isLoading } = useAccess();
  const { data: progress } = useLessonProgress();
  const lessons = lessonsFor(access);
  const isPractice = Boolean(access?.isPractice);
  const completed = new Set((progress ?? []).filter((row) => row.status === 'completed').map((row) => row.lesson_code));
  const completedCount = lessons.filter((lesson) => completed.has(lesson.code)).length;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <PageHeader title="Aprender" description="Lecciones guiadas, paso a paso, para aprender a usar el sistema practicando de verdad" />

      {access?.isSystem ? (
        <EmptyState
          icon={GraduationCap}
          title="El modo enseñanza es para las cuentas de una empresa"
          description="Cada persona de una empresa practica en su propia empresa de práctica."
        />
      ) : (
        <>
          {isPractice ? <PracticeIntro /> : <RealAccountIntro />}
          <CourseProgress done={completedCount} total={lessons.length} />
          <LessonGrid lessons={lessons} completed={completed} isPractice={isPractice} />
          {!isPractice && <TeamProgressSection totalLessons={lessons.length} />}
        </>
      )}
    </div>
  );
}

function PracticeIntro() {
  const { startLesson } = useStartLesson();
  const { data: access } = useAccess();
  const startedPending = useRef(false);

  // Lección pedida desde la cuenta real ("Practicar" en una lección): arranca sola.
  useEffect(() => {
    if (startedPending.current || !access) return;
    startedPending.current = true;
    const code = pendingLesson.take();
    const lesson = lessonsFor(access).find((candidate) => candidate.code === code);
    if (lesson) void startLesson(lesson);
  }, [access, startLesson]);

  return (
    <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
      Elige una lección y sigue la luz: el sistema te va diciendo qué tocar. Puedes repetirlas las veces que quieras.
    </div>
  );
}

function RealAccountIntro() {
  const { mutate: startPractice, isPending } = useStartPractice();
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-orange/15">
        <GraduationCap className="size-6 text-brand-orange-deep" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">Practica sin miedo</h2>
        <p className="text-sm text-muted-foreground">
          Las lecciones se hacen en tu propia empresa de práctica, con clientes y productos de ejemplo. Nada de lo que hagas ahí toca tus
          datos reales, y vuelves a tu cuenta con un clic.
        </p>
      </div>
      <Button
        type="button"
        disabled={isPending}
        onClick={() =>
          startPractice(undefined, {
            onSuccess: (session) => enterPracticeSession(session, { fromPractice: false }),
            onError: (error) => toast.error((error as ApiClientError).message ?? 'No se pudo entrar a la práctica'),
          })
        }
      >
        <PlayCircle className="size-4" />
        {isPending ? 'Preparando...' : 'Entrar a la práctica'}
      </Button>
    </div>
  );
}

function CourseProgress({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1.5" data-testid="course-progress">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Tu avance</span>
        <span className="text-muted-foreground">
          {done} de {total} lecciones
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand-orange transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function LessonGrid({ lessons, completed, isPractice }: { lessons: TutorialLesson[]; completed: Set<string>; isPractice: boolean }) {
  const { startLesson, isPreparing } = useStartLesson();
  const activeCode = useTutorialStore((state) => state.active?.code ?? null);
  const { mutate: startPractice, isPending: isEntering } = useStartPractice();
  const [requested, setRequested] = useState<string | null>(null);

  // Desde la cuenta real, "Practicar" entra a la práctica y arranca esa lección.
  const practice = (lesson: TutorialLesson) => {
    setRequested(lesson.code);
    startPractice(undefined, {
      onSuccess: (session) => enterPracticeSession(session, { fromPractice: false, lessonCode: lesson.code }),
      onError: (error) => {
        setRequested(null);
        toast.error((error as ApiClientError).message ?? 'No se pudo entrar a la práctica');
      },
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson, index) => {
        const isDone = completed.has(lesson.code);
        const Icon = lesson.icon;
        const busy = isPreparing || isEntering || activeCode !== null;
        return (
          <div
            key={lesson.code}
            data-testid={`lesson-${lesson.code}`}
            className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4', isDone && 'border-success/40')}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lección {index + 1}</p>
                <h3 className="font-semibold leading-snug">{lesson.title}</h3>
              </div>
              {isDone && (
                <Badge variant="secondary" className="gap-1 text-[var(--success)]">
                  <CheckCircle2 className="size-3.5" />
                  Hecha
                </Badge>
              )}
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{lesson.summary}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5" />~{lesson.minutes} min
              </span>
              <Button
                type="button"
                size="sm"
                variant={isDone ? 'outline' : 'default'}
                disabled={busy}
                onClick={() => (isPractice ? void startLesson(lesson) : practice(lesson))}
              >
                {isDone ? <RotateCcw className="size-4" /> : <PlayCircle className="size-4" />}
                {requested === lesson.code ? 'Entrando...' : isDone ? 'Repetir' : isPractice ? 'Empezar' : 'Practicar'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const TEAM_PAGE_SIZE = 10;

// Quién aprendió qué (solo administradores).
function TeamProgressSection({ totalLessons }: { totalLessons: number }) {
  const canSee = usePermissionButton('tutorial.teamProgress.button');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(TEAM_PAGE_SIZE);
  const { data, isLoading } = useTeamProgress({ page, limit: pageSize }, canSee);
  if (!canSee) return null;

  const lessonTitle = (code: string) => LESSONS.find((lesson) => lesson.code === code)?.title ?? code;

  return (
    <section className="space-y-3" data-testid="team-progress">
      <h2 className="flex items-center gap-2 font-semibold">
        <Users className="size-4" />
        Avance del equipo
      </h2>
      <DataTable<TeamMemberProgress>
        columns={[
          {
            header: 'Persona',
            cell: (member) => (
              <div className="min-w-0">
                <p className="truncate font-medium">{member.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
            ),
          },
          { header: 'Rol', cell: (member) => member.role_name ?? '—' },
          {
            header: 'Lecciones hechas',
            cell: (member) => (
              <span title={member.completed_lessons.map(lessonTitle).join(', ')}>
                {member.completed_lessons.length} de {totalLessons}
              </span>
            ),
          },
          { header: 'Última vez', cell: (member) => <span className="whitespace-nowrap">{formatDateTime(member.last_activity)}</span> },
        ]}
        rows={data?.data ?? []}
        rowKey={(member) => member.user_id}
        isLoading={isLoading}
        emptyIcon={Users}
        emptyTitle="Todavía no hay personas en tu empresa"
      />
      {data && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </section>
  );
}
