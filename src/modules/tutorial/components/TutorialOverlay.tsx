import { motion, useAnimationControls } from 'framer-motion';
import { GraduationCap, Pointer, SkipForward, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import {
  boxOf,
  currentToasts,
  findFirstTarget,
  findTarget,
  normalizeText,
  openPoppers,
  sameBoxes,
  type Box,
} from '@/modules/tutorial/engine/dom';
import { useSaveLessonProgress } from '@/modules/tutorial/hooks/useTutorial';
import { useTutorialStore } from '@/modules/tutorial/hooks/useTutorialStore';
import { findLesson } from '@/modules/tutorial/lessons';
import { LessonFinishedCard } from '@/modules/tutorial/components/LessonFinishedCard';
import type { ActiveLesson, StepDone, TutorialLesson, TutorialStep } from '@/modules/tutorial/types/tutorial.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { useIsMobile } from '@/presentation/hooks/use-mobile';

// Cada cuánto se busca el elemento iluminado y se revisa si el paso terminó.
const POLL_MS = 150;
// Si el elemento del paso no aparece en este tiempo (ej. cerraron la ventana),
// la lección vuelve al último paso que sí está en pantalla.
const MISSING_REWIND_MS = 2000;
const CARD_WIDTH = 360;
const CARD_GAP = 14;
const EDGE = 8;

// Eventos que se bloquean fuera de la zona iluminada ("como en los videojuegos":
// no se puede tocar otra cosa).
const BLOCKED_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart'] as const;

// Capa del modo enseñanza: se monta una sola vez en el Shell y solo dibuja algo
// cuando hay una lección en curso o recién terminada.
export function TutorialOverlay() {
  const active = useTutorialStore((state) => state.active);
  const finishedCode = useTutorialStore((state) => state.finishedCode);
  const lesson = active ? findLesson(active.code) : undefined;

  if (finishedCode) return <LessonFinishedCard code={finishedCode} />;
  if (!active || !lesson) return null;
  return <LessonRunner key={active.code} lesson={lesson} active={active} />;
}

interface Boxes {
  holes: Box[];
  pointer: Box | null;
}

const EMPTY_BOXES: Boxes = { holes: [], pointer: null };

function LessonRunner({ lesson, active }: { lesson: TutorialLesson; active: ActiveLesson }) {
  const steps = useMemo(() => lesson.steps(active.context), [lesson, active.context]);
  const step = steps[active.stepIndex];
  const goTo = useTutorialStore((state) => state.goTo);
  const finish = useTutorialStore((state) => state.finish);
  const stop = useTutorialStore((state) => state.stop);
  const { mutate: saveProgress } = useSaveLessonProgress();
  const { pathname } = useLocation();

  const [boxes, setBoxes] = useState<Boxes>(EMPTY_BOXES);
  // Paso cuyo elemento no aparece (se deriva por paso: al cambiar de paso deja de valer solo).
  const [missingStepId, setMissingStepId] = useState<string | null>(null);
  const [blockedTouches, setBlockedTouches] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const seenToasts = useRef<WeakSet<Element>>(new WeakSet());
  const missingSince = useRef<number | null>(null);
  const advancing = useRef(false);

  // Paso terminado: guarda el avance en los checkpoints y al final.
  const advance = useCallback(() => {
    if (advancing.current || !step) return;
    advancing.current = true;
    const next = active.stepIndex + 1;
    if (next >= steps.length) {
      saveProgress({ code: lesson.code, dto: { step_index: steps.length, completed: true } });
      finish();
      return;
    }
    const floor = step.checkpoint ? next : active.floor;
    if (step.checkpoint) saveProgress({ code: lesson.code, dto: { step_index: next, completed: false } });
    goTo(next, floor);
  }, [active.floor, active.stepIndex, finish, goTo, lesson.code, saveProgress, step, steps.length]);

  // Volver al último paso cuyo elemento sí está en pantalla (sin pasar el checkpoint).
  const rewind = useCallback((): boolean => {
    for (let index = active.stepIndex - 1; index >= active.floor; index -= 1) {
      const candidate = steps[index];
      if (candidate?.target && findFirstTarget(candidate.target)) {
        goTo(index);
        return true;
      }
    }
    return false;
  }, [active.floor, active.stepIndex, goTo, steps]);

  // Al entrar a un paso: los avisos que ya estaban no cuentan, y se lleva la
  // vista hasta el elemento.
  useEffect(() => {
    advancing.current = false;
    missingSince.current = null;
    seenToasts.current = new WeakSet(currentToasts());
    findFirstTarget(step?.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [step]);

  // Bucle del paso: ubica la zona iluminada, la mano, y revisa si el paso terminó.
  useEffect(() => {
    if (!step) return undefined;
    const tick = () => {
      const target = findFirstTarget(step.target);
      const allowed = (step.allow ?? []).map(findTarget).filter((element): element is HTMLElement => element !== null);
      const holes = [target, ...allowed, ...openPoppers()]
        .filter((element): element is HTMLElement => element !== null)
        .map((element) => boxOf(element));
      const pointerElement = step.pointer === null ? null : findFirstTarget(step.pointer ?? step.target);
      const pointer = pointerElement ? boxOf(pointerElement, 0) : null;
      setBoxes((previous) =>
        sameBoxes(previous.holes, holes) && sameBoxes(previous.pointer ? [previous.pointer] : [], pointer ? [pointer] : [])
          ? previous
          : { holes, pointer },
      );

      if (isStepDone(step.done, pathname, seenToasts.current)) {
        advance();
        return;
      }

      if (!step.target || target) {
        missingSince.current = null;
        setMissingStepId(null);
        return;
      }
      missingSince.current ??= Date.now();
      if (Date.now() - missingSince.current < MISSING_REWIND_MS) return;
      if (rewind()) return;
      setMissingStepId(step.id);
    };
    tick();
    const interval = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(interval);
  }, [advance, pathname, rewind, step]);

  // Bloqueo: fuera de la zona iluminada no se puede tocar nada; Escape tampoco
  // cierra ventanas. Se escucha en "captura" (antes que la app).
  useEffect(() => {
    if (!step) return undefined;
    const allowedElements = (): HTMLElement[] =>
      [findFirstTarget(step.target), ...(step.allow ?? []).map(findTarget), ...openPoppers()].filter(
        (element): element is HTMLElement => element !== null,
      );

    const onPointer = (event: Event) => {
      const node = event.target;
      if (!(node instanceof Node)) return;
      if (cardRef.current?.contains(node)) {
        // La tarjeta vive fuera de las ventanas del sistema: que tocarla no las cierre.
        if (event.type !== 'click') event.stopPropagation();
        return;
      }
      if (allowedElements().some((element) => element.contains(node))) {
        if (event.type === 'click' && step.done.kind === 'click' && findFirstTarget(step.target)?.contains(node)) {
          // Se deja que la app procese el clic y recién ahí se avanza.
          window.setTimeout(advance, 80);
        }
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === 'pointerdown' || event.type === 'touchstart') setBlockedTouches((count) => count + 1);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    BLOCKED_EVENTS.forEach((type) => window.addEventListener(type, onPointer, { capture: true, passive: false }));
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      BLOCKED_EVENTS.forEach((type) => window.removeEventListener(type, onPointer, { capture: true }));
      window.removeEventListener('keydown', onKey, { capture: true });
    };
  }, [advance, step]);

  if (!step) return null;

  const restartSection = () => goTo(active.floor);

  return createPortal(
    <>
      <Spotlight holes={boxes.holes} />
      {boxes.holes[0] && <PulseRing box={boxes.holes[0]} />}
      {boxes.pointer && <PointerHand box={boxes.pointer} />}
      <StepCard
        ref={cardRef}
        lesson={lesson}
        step={step}
        index={active.stepIndex}
        total={steps.length}
        holes={boxes.holes}
        missing={missingStepId === step.id}
        blockedTouches={blockedTouches}
        onAck={advance}
        onSkip={advance}
        onRestartSection={restartSection}
        onExit={stop}
      />
    </>,
    document.body,
  );
}

function isStepDone(done: StepDone, pathname: string, seenToasts: WeakSet<Element>): boolean {
  switch (done.kind) {
    case 'route':
      return pathname === done.path;
    case 'appear':
      return findTarget(done.target) !== null;
    case 'disappear':
      return findTarget(done.target) === null;
    case 'toast':
      return currentToasts().some(
        (toast) =>
          !seenToasts.has(toast) && done.texts.some((text) => normalizeText(toast.textContent).includes(normalizeText(text))),
      );
    case 'check':
      return done.test();
    case 'click':
    case 'ack':
      // Se resuelven con eventos (clic en el elemento / botón de la tarjeta).
      return false;
  }
}

// Fondo oscuro con "huecos" donde se puede tocar. No recibe clics (el bloqueo
// lo hacen los listeners), así lo de abajo sigue funcionando en los huecos.
function Spotlight({ holes }: { holes: Box[] }) {
  return (
    <svg className="pointer-events-none fixed inset-0 z-[60] h-full w-full" aria-hidden>
      <defs>
        <mask id="tutorial-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          {holes.map((hole, index) => (
            <rect key={index} x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={10} fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" className="fill-black/60" mask="url(#tutorial-spotlight-mask)" />
    </svg>
  );
}

function PulseRing({ box }: { box: Box }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[61] rounded-[10px] ring-[3px] ring-brand-orange"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      animate={{ opacity: [1, 0.35, 1], scale: [1, 1.015, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Mano que apunta al elemento (debajo; arriba si no hay espacio).
function PointerHand({ box }: { box: Box }) {
  const below = box.y + box.height + 44 < window.innerHeight;
  const left = box.x + box.width / 2 - 16;
  const top = below ? box.y + box.height + 2 : box.y - 38;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[62]"
      style={{ left, top }}
      animate={{ y: below ? [0, -8, 0] : [0, 8, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Pointer className={`size-9 fill-white text-brand-orange-deep drop-shadow-lg ${below ? '' : 'rotate-180'}`} strokeWidth={1.75} />
    </motion.div>
  );
}

interface CardPosition {
  left: number;
  top: number;
  width: number;
}

// Tarjeta del paso: nunca encima de lo que hay que tocar (el elemento y las
// listas abiertas, ej. las opciones de un buscador). Va debajo de todo eso, si
// no arriba, si no al costado; si nada cabe, en la primera esquina libre.
const intersects = (a: Box, b: Box): boolean =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const unionOf = (boxes: Box[]): Box | null => {
  const first = boxes[0];
  if (!first) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

function computeCardPosition(holes: Box[], cardHeight: number, isMobile: boolean): CardPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportWidth - EDGE * 2);
  const free = (position: CardPosition) =>
    !holes.some((hole) => intersects(hole, { x: position.left, y: position.top, width: position.width, height: cardHeight }));

  // Celular: abajo a lo ancho; arriba si abajo tapa lo que hay que tocar.
  if (isMobile) {
    const bottom = { left: EDGE, top: viewportHeight - cardHeight - EDGE, width };
    return free(bottom) ? bottom : { left: EDGE, top: EDGE, width };
  }
  const anchor = unionOf(holes);
  if (!anchor) return { left: (viewportWidth - width) / 2, top: Math.max(EDGE, (viewportHeight - cardHeight) / 2), width };

  const clampLeft = (value: number) => Math.min(Math.max(EDGE, value), viewportWidth - width - EDGE);
  const clampTop = (value: number) => Math.min(Math.max(EDGE, value), viewportHeight - cardHeight - EDGE);
  const centeredLeft = clampLeft(anchor.x + anchor.width / 2 - width / 2);

  const candidates: CardPosition[] = [];
  if (anchor.y + anchor.height + CARD_GAP + cardHeight <= viewportHeight - EDGE) {
    candidates.push({ left: centeredLeft, top: anchor.y + anchor.height + CARD_GAP, width });
  }
  if (anchor.y - CARD_GAP - cardHeight >= EDGE) candidates.push({ left: centeredLeft, top: anchor.y - CARD_GAP - cardHeight, width });
  if (anchor.x + anchor.width + CARD_GAP + width <= viewportWidth - EDGE) {
    candidates.push({ left: anchor.x + anchor.width + CARD_GAP, top: clampTop(anchor.y), width });
  }
  if (anchor.x - CARD_GAP - width >= EDGE) candidates.push({ left: anchor.x - CARD_GAP - width, top: clampTop(anchor.y), width });
  const corners: CardPosition[] = [
    { left: viewportWidth - width - EDGE * 2, top: viewportHeight - cardHeight - EDGE * 2, width },
    { left: EDGE * 2, top: viewportHeight - cardHeight - EDGE * 2, width },
    { left: viewportWidth - width - EDGE * 2, top: EDGE * 2, width },
    { left: EDGE * 2, top: EDGE * 2, width },
  ];
  return [...candidates, ...corners].find(free) ?? candidates[0] ?? corners[0]!;
}

interface StepCardProps {
  lesson: TutorialLesson;
  step: TutorialStep;
  index: number;
  total: number;
  holes: Box[];
  missing: boolean;
  blockedTouches: number;
  onAck: () => void;
  onSkip: () => void;
  onRestartSection: () => void;
  onExit: () => void;
}

const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  { lesson, step, index, total, holes, missing, blockedTouches, onAck, onSkip, onRestartSection, onExit },
  ref,
) {
  const isMobile = useIsMobile();
  const controls = useAnimationControls();
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [cardHeight, setCardHeight] = useState(200);
  const [, setViewport] = useState(0);

  // Medir la tarjeta (su alto cambia con el texto) y reubicarla al cambiar el tamaño de la ventana.
  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() => setCardHeight(element.offsetHeight));
    observer.observe(element);
    const onResize = () => setViewport(window.innerWidth + window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Tocó fuera de la zona: la tarjeta "tiembla" para que mire las instrucciones.
  useEffect(() => {
    if (blockedTouches === 0) return;
    void controls.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.45 } });
  }, [blockedTouches, controls]);

  const position = computeCardPosition(holes, cardHeight, isMobile);
  const progress = Math.round(((index + 1) / total) * 100);
  const showNudge = blockedTouches > 0 && step.done.kind !== 'ack';

  return (
    <motion.div
      ref={(element) => {
        innerRef.current = element;
        if (typeof ref === 'function') ref(element);
        else if (ref) ref.current = element;
      }}
      animate={controls}
      data-tutorial-card
      // "region" y no "dialog": las lecciones buscan las ventanas del sistema
      // por role="dialog" y la tarjeta no debe confundirse con ellas.
      role="region"
      aria-live="polite"
      aria-label={`Lección: ${lesson.title}`}
      className="pointer-events-auto fixed z-[63] rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl transition-[left,top] duration-200"
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      <div className="mb-2 flex items-center gap-2">
        <GraduationCap className="size-4 shrink-0 text-brand-orange-deep" />
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">{lesson.title}</p>
        <button
          type="button"
          onClick={onExit}
          aria-label="Salir de la lección"
          title="Salir de la lección (tu avance queda guardado)"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <motion.div className="h-full rounded-full bg-brand-orange" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground" data-testid="tutorial-step-counter">
        Paso {index + 1} de {total}
      </p>
      <h3 className="mt-0.5 text-base font-semibold leading-snug" data-testid="tutorial-step-title">
        {step.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      {step.hint && <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs">{step.hint}</p>}
      {showNudge && !missing && (
        <p className="mt-2 text-xs font-medium text-brand-orange-deep">Primero haz lo que está iluminado.</p>
      )}
      {missing && (
        <div className="mt-2 space-y-2 rounded-md border border-dashed p-2">
          <p className="text-xs text-muted-foreground">No encuentro dónde seguir (quizá se cerró una ventana).</p>
          <Button type="button" size="sm" variant="outline" onClick={onRestartSection}>
            Volver a empezar este tramo
          </Button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-end gap-2">
        {step.skippable && (
          <Button type="button" size="sm" variant="ghost" onClick={onSkip}>
            <SkipForward className="size-4" />
            Saltar este paso
          </Button>
        )}
        {step.done.kind === 'ack' && (
          <Button type="button" size="sm" onClick={onAck} data-testid="tutorial-ack">
            {step.done.label ?? 'Entendido'}
          </Button>
        )}
      </div>
    </motion.div>
  );
});
