import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { motion, useAnimationControls } from 'framer-motion';
import { ChevronUp, GraduationCap, Minus, Pointer, SkipForward, X } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

import {
  boxOf,
  currentToasts,
  findFirstTarget,
  findTarget,
  fitToViewport,
  isVisible,
  normalizeText,
  openPoppers,
  openWindows,
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
// la lección vuelve al último paso que sí está en pantalla. El tiempo solo
// corre con el sistema quieto: mientras carga o guarda algo, el elemento puede
// tardar (en el hosting, varios segundos) y no es que se haya cerrado nada.
const MISSING_REWIND_MS = 3000;
const CARD_WIDTH = 360;
// Ancho mínimo de la tarjeta al costado de una ventana grande (con 200 cabe al
// lado de la vista previa de un PDF en una laptop, sin taparle el título).
const MIN_SIDE_WIDTH = 200;
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
  // Donde se puede tocar (lo iluminado y las listas abiertas).
  holes: Box[];
  // Lo que la tarjeta evita si puede (ventanas abiertas y avisos).
  soft: Box[];
  pointer: Box | null;
}

const EMPTY_BOXES: Boxes = { holes: [], soft: [], pointer: null };

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
  // El elemento del paso ya se llevó a la vista (una vez por paso, cuando aparece).
  const scrolledStep = useRef<string | null>(null);
  // Para los pasos "cerrar": cuándo empezó el paso y si la ventana ya se vio.
  // (Se fija en el efecto de cada paso.)
  const stepStartedAt = useRef(0);
  const disappearSeen = useRef(false);
  // Paso cuyo elemento quedó fuera de la pantalla (la persona se desplazó).
  const [offscreenStepId, setOffscreenStepId] = useState<string | null>(null);
  // ¿El sistema está cargando o guardando algo? (React Query.) Se lee desde el bucle del paso.
  const fetching = useIsFetching();
  const mutating = useIsMutating();
  const serverBusy = useRef(false);
  useEffect(() => {
    serverBusy.current = fetching + mutating > 0;
  }, [fetching, mutating]);

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

  // Al entrar a un paso: los avisos que ya estaban no cuentan.
  useEffect(() => {
    advancing.current = false;
    missingSince.current = null;
    stepStartedAt.current = Date.now();
    disappearSeen.current = false;
    seenToasts.current = new WeakSet(currentToasts());
  }, [step]);

  // Bucle del paso: ubica la zona iluminada, la mano, y revisa si el paso terminó.
  useEffect(() => {
    if (!step) return undefined;
    const tick = () => {
      const target = findFirstTarget(step.target);
      // Se lleva la vista hasta el elemento cuando aparece (no al empezar el
      // paso: la pantalla puede estar cargando o venir desplazada de otra).
      if (target && scrolledStep.current !== step.id) {
        scrolledStep.current = step.id;
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const allowed = (step.allow ?? []).map(findTarget).filter((element): element is HTMLElement => element !== null);
      const holes = [target, ...allowed, ...openPoppers()]
        .filter((element): element is HTMLElement => element !== null)
        .map((element) => fitToViewport(boxOf(element)));
      const pointerElement = step.pointer === null ? null : findFirstTarget(step.pointer ?? step.target);
      // Mismo margen que el borde naranja: la mano se ubica fuera de él.
      const pointer = pointerElement ? boxOf(pointerElement) : null;
      // Lo que la tarjeta prefiere no tapar: la ventana abierta entera (su botón
      // "Guardar", sus campos) y los avisos.
      const soft = [...openWindows(), ...currentToasts()].filter(isVisible).map((element) => boxOf(element, 0));
      setBoxes((previous) =>
        sameBoxes(previous.holes, holes) &&
        sameBoxes(previous.soft, soft) &&
        sameBoxes(previous.pointer ? [previous.pointer] : [], pointer ? [pointer] : [])
          ? previous
          : { holes, soft, pointer },
      );

      if (step.done.kind === 'disappear' && findTarget(step.done.target)) disappearSeen.current = true;
      const waited = { seen: disappearSeen.current, elapsedMs: Date.now() - stepStartedAt.current };
      if (isStepDone(step.done, pathname, seenToasts.current, waited)) {
        advance();
        return;
      }

      if (!step.target || target) {
        missingSince.current = null;
        setMissingStepId(null);
        setOffscreenStepId(target && !onScreen(target) ? step.id : null);
        return;
      }
      if (serverBusy.current) {
        missingSince.current = null;
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
      // Salidas de emergencia (la franja del modo enseñanza: lecciones, reiniciar,
      // volver a mi cuenta): siempre se pueden tocar, aunque no estén iluminadas.
      const element = node instanceof Element ? node : node.parentElement;
      if (element?.closest('[data-tutorial-escape]')) return;
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

  const hand = boxes.pointer ? handPlacement(boxes.pointer) : null;
  const restartSection = () => goTo(active.floor);

  return createPortal(
    <>
      <Spotlight holes={boxes.holes} />
      {boxes.holes[0] && <PulseRing box={boxes.holes[0]} />}
      {hand && <PointerHand placement={hand} />}
      <StepCard
        ref={cardRef}
        lesson={lesson}
        step={step}
        index={active.stepIndex}
        total={steps.length}
        obstacles={hand ? [...boxes.holes, hand.area] : boxes.holes}
        softObstacles={boxes.soft}
        targetBox={boxes.holes[0] ?? null}
        missing={missingStepId === step.id}
        offscreen={offscreenStepId === step.id}
        onShowTarget={() => findFirstTarget(step.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
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

function isStepDone(
  done: StepDone,
  pathname: string,
  seenToasts: WeakSet<Element>,
  waited: { seen: boolean; elapsedMs: number },
): boolean {
  switch (done.kind) {
    case 'route':
      return pathname === done.path;
    case 'appear':
      return findTarget(done.target) !== null;
    case 'disappear':
      if (findTarget(done.target) !== null) return false;
      return !done.waitForAppearMs || waited.seen || waited.elapsedMs >= done.waitForAppearMs;
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
      data-testid="tutorial-ring"
      className="pointer-events-none fixed z-[61] rounded-[10px] ring-[3px] ring-brand-orange"
      style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      animate={{ opacity: [1, 0.35, 1], scale: [1, 1.015, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

// Mano que apunta al elemento: debajo del borde naranja (arriba si no hay
// espacio), SIEMPRE fuera de él. El rebote la aleja y la acerca sin entrar
// nunca al elemento, así no tapa sus letras (pedido del usuario).
const HAND_SIZE = 36;
const HAND_GAP = 4;
const HAND_BOUNCE = 8;

interface HandPlacement {
  left: number;
  top: number;
  below: boolean;
  // Todo lo que ocupa la mano con su rebote: la tarjeta no se pone encima.
  area: Box;
}

function handPlacement(box: Box): HandPlacement {
  const below = box.y + box.height + HAND_GAP + HAND_SIZE + HAND_BOUNCE <= window.innerHeight;
  const left = Math.min(Math.max(EDGE, box.x + box.width / 2 - HAND_SIZE / 2), window.innerWidth - HAND_SIZE - EDGE);
  const top = below ? box.y + box.height + HAND_GAP : box.y - HAND_GAP - HAND_SIZE;
  const area = { x: left, y: below ? top : top - HAND_BOUNCE, width: HAND_SIZE, height: HAND_SIZE + HAND_BOUNCE };
  return { left, top, below, area };
}

function PointerHand({ placement }: { placement: HandPlacement }) {
  const away = placement.below ? HAND_BOUNCE : -HAND_BOUNCE;
  return (
    <motion.div
      aria-hidden
      data-testid="tutorial-hand"
      className="pointer-events-none fixed z-[64]"
      style={{ left: placement.left, top: placement.top }}
      animate={{ y: [away, 0, away] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Pointer
        className={`size-9 fill-white text-brand-orange-deep drop-shadow-lg ${placement.below ? '' : 'rotate-180'}`}
        strokeWidth={1.75}
      />
    </motion.div>
  );
}

interface CardPosition {
  left: number;
  top: number;
  width: number;
}

// ¿Se ve algo del elemento en la pantalla?
const onScreen = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
};

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

const overlapArea = (a: Box, b: Box): number => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
};

// Lugares junto a una zona: debajo, arriba y a los costados (que entren en la pantalla).
function placesAround(anchor: Box, width: number, cardHeight: number): CardPosition[] {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clampLeft = (value: number) => Math.min(Math.max(EDGE, value), viewportWidth - width - EDGE);
  const clampTop = (value: number) => Math.min(Math.max(EDGE, value), viewportHeight - cardHeight - EDGE);
  const centeredLeft = clampLeft(anchor.x + anchor.width / 2 - width / 2);

  const places: CardPosition[] = [];
  const belowTop = anchor.y + anchor.height + CARD_GAP;
  if (belowTop >= EDGE && belowTop + cardHeight <= viewportHeight - EDGE) places.push({ left: centeredLeft, top: belowTop, width });
  const aboveTop = anchor.y - CARD_GAP - cardHeight;
  if (aboveTop >= EDGE && aboveTop + cardHeight <= viewportHeight - EDGE) places.push({ left: centeredLeft, top: aboveTop, width });
  // Al costado: si no entra el ancho completo, la tarjeta se angosta (así cabe
  // junto a una ventana grande sin taparla).
  const rightSpace = viewportWidth - (anchor.x + anchor.width) - CARD_GAP - EDGE;
  if (rightSpace >= MIN_SIDE_WIDTH) {
    places.push({ left: anchor.x + anchor.width + CARD_GAP, top: clampTop(anchor.y), width: Math.min(width, rightSpace) });
  }
  const leftSpace = anchor.x - CARD_GAP - EDGE;
  if (leftSpace >= MIN_SIDE_WIDTH) {
    const sideWidth = Math.min(width, leftSpace);
    places.push({ left: anchor.x - CARD_GAP - sideWidth, top: clampTop(anchor.y), width: sideWidth });
  }
  return places;
}

// Tarjeta del paso. Nunca encima de lo que hay que tocar (`holes`: lo
// iluminado, las listas abiertas y la mano). Si puede, tampoco encima de la
// ventana abierta ni de los avisos (`soft`): ahí están el "Guardar" y los
// campos que la persona igual necesita ver (pedido del usuario 26-nov: "pide
// dar clic en cosas que no deja"). Orden: junto a lo iluminado, junto a la
// ventana, en una esquina; si nada queda libre, donde tape menos lo iluminado.
function computeCardPosition(holes: Box[], soft: Box[], cardHeight: number, isMobile: boolean): CardPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(CARD_WIDTH, viewportWidth - EDGE * 2);
  const boxOfCard = (position: CardPosition): Box => ({ x: position.left, y: position.top, width: position.width, height: cardHeight });
  const clearOf = (obstacles: Box[]) => (position: CardPosition) => !obstacles.some((box) => intersects(box, boxOfCard(position)));
  // Lo que menos tapa lo iluminado (y después, lo que menos tapa en total).
  const leastCovering = (positions: CardPosition[]): CardPosition | undefined =>
    positions
      .map((position) => ({
        position,
        onTarget: holes[0] ? overlapArea(holes[0], boxOfCard(position)) : 0,
        onAll: holes.reduce((sum, box) => sum + overlapArea(box, boxOfCard(position)), 0),
      }))
      .sort((a, b) => a.onTarget - b.onTarget || a.onAll - b.onAll)[0]?.position;

  // Celular: a lo ancho, abajo o arriba (lo que no tape lo que hay que tocar).
  // Si tapa sí o sí (una ventana que ocupa toda la pantalla), arriba: mejor su
  // título que sus botones de abajo. La tarjeta además se puede minimizar.
  if (isMobile) {
    const bottom = { left: EDGE, top: viewportHeight - cardHeight - EDGE, width };
    const top = { left: EDGE, top: EDGE, width };
    return [bottom, top].find(clearOf([...holes, ...soft])) ?? [bottom, top].find(clearOf(holes)) ?? top;
  }
  const anchor = unionOf(holes);
  if (!anchor) return { left: (viewportWidth - width) / 2, top: Math.max(EDGE, (viewportHeight - cardHeight) / 2), width };

  // Esquinas: primero las de arriba. Si no queda otra que tapar algo, mejor el
  // título de una ventana que sus botones de abajo ("Guardar", "Crear"...).
  const topRight = { left: viewportWidth - width - EDGE * 2, top: EDGE * 2, width };
  const corners: CardPosition[] = [
    topRight,
    { left: EDGE * 2, top: EDGE * 2, width },
    { left: viewportWidth - width - EDGE * 2, top: viewportHeight - cardHeight - EDGE * 2, width },
    { left: EDGE * 2, top: viewportHeight - cardHeight - EDGE * 2, width },
  ];
  const windows = unionOf(soft.filter((box) => intersects(box, anchor)));
  const candidates = [...placesAround(anchor, width, cardHeight), ...(windows ? placesAround(windows, width, cardHeight) : []), ...corners];
  return (
    candidates.find(clearOf([...holes, ...soft])) ??
    candidates.find(clearOf(holes)) ??
    leastCovering(candidates) ??
    topRight
  );
}

interface StepCardProps {
  lesson: TutorialLesson;
  step: TutorialStep;
  index: number;
  total: number;
  // Lo que la tarjeta no debe tapar: zonas iluminadas, listas abiertas y la mano.
  obstacles: Box[];
  // Lo que evita si puede: la ventana abierta y los avisos.
  softObstacles: Box[];
  // Lo iluminado del paso (si la tarjeta completa lo taparía, se achica sola).
  targetBox: Box | null;
  missing: boolean;
  blockedTouches: number;
  onAck: () => void;
  onSkip: () => void;
  onRestartSection: () => void;
  // El elemento del paso quedó fuera de la pantalla: botón para volver a él.
  offscreen: boolean;
  onShowTarget: () => void;
  onExit: () => void;
}

const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  {
    lesson,
    step,
    index,
    total,
    obstacles,
    softObstacles,
    targetBox,
    missing,
    offscreen,
    blockedTouches,
    onAck,
    onSkip,
    onRestartSection,
    onShowTarget,
    onExit,
  },
  ref,
) {
  const isMobile = useIsMobile();
  const controls = useAnimationControls();
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Alto de la tarjeta completa y de la achicada (se miden; cambian con el texto).
  const [fullHeight, setFullHeight] = useState(200);
  const [compactHeight, setCompactHeight] = useState(96);
  const collapsedRef = useRef(false);
  const [, setViewport] = useState(0);

  // Medir la tarjeta y reubicarla al cambiar el tamaño de la ventana.
  useLayoutEffect(() => {
    const element = innerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(() =>
      collapsedRef.current ? setCompactHeight(element.offsetHeight) : setFullHeight(element.offsetHeight),
    );
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

  // Tarjeta achicada (solo el título del paso):
  //  - sola, cuando completa no cabe en ningún lado sin tapar lo que hay que
  //    tocar (ej. un formulario que llena toda la ventana). No en los pasos de
  //    "Entendido": ahí no hay nada que tocar debajo y el botón está en la tarjeta;
  //  - a mano, con el botón "–" (vale para este paso y hasta el próximo toque bloqueado).
  // La persona siempre puede abrirla para leer todo.
  const [minimized, setMinimized] = useState<{ stepId: string; touches: number } | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const fullPosition = computeCardPosition(obstacles, softObstacles, fullHeight, isMobile);
  const fullCoversTarget = targetBox !== null && intersects(targetBox, { x: fullPosition.left, y: fullPosition.top, width: fullPosition.width, height: fullHeight });
  const autoCompact = fullCoversTarget && step.done.kind !== 'ack' && expandedStepId !== step.id;
  const manualCompact = minimized?.stepId === step.id && minimized.touches === blockedTouches;
  const collapsed = (autoCompact || manualCompact) && !missing;
  useLayoutEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);
  const toggleCollapsed = () => {
    if (collapsed) {
      setMinimized(null);
      setExpandedStepId(step.id);
      return;
    }
    setMinimized({ stepId: step.id, touches: blockedTouches });
  };

  const position = collapsed ? computeCardPosition(obstacles, softObstacles, compactHeight, isMobile) : fullPosition;
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
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Mostrar instrucciones' : 'Minimizar instrucciones'}
          title={collapsed ? 'Mostrar instrucciones' : 'Minimizar (si el cuadro tapa algo)'}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {collapsed ? <ChevronUp className="size-3.5" /> : <Minus className="size-3.5" />}
        </button>
        {/* Con texto (no solo una X): la salida tiene que verse. */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Salir de la lección"
          title="Salir de la lección (tu avance queda guardado)"
          className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          Salir
        </button>
      </div>
      {!collapsed && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <motion.div className="h-full rounded-full bg-brand-orange" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      )}
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground" data-testid="tutorial-step-counter">
        Paso {index + 1} de {total}
      </p>
      <h3 className="mt-0.5 text-base font-semibold leading-snug" data-testid="tutorial-step-title">
        {step.title}
      </h3>
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="mt-1 text-xs font-medium text-brand-orange-deep underline-offset-2 hover:underline"
        >
          Ver instrucciones
        </button>
      )}
      {!collapsed && <StepDetails step={step} />}
      {!collapsed && (
        <StepActions
          step={step}
          missing={missing}
          offscreen={offscreen}
          showNudge={showNudge}
          onAck={onAck}
          onSkip={onSkip}
          onRestartSection={onRestartSection}
          onShowTarget={onShowTarget}
        />
      )}
    </motion.div>
  );
});

function StepDetails({ step }: { step: TutorialStep }) {
  return (
    <>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
      {step.hint && <p className="mt-2 rounded-md bg-muted px-2.5 py-1.5 text-xs">{step.hint}</p>}
    </>
  );
}

interface StepActionsProps {
  step: TutorialStep;
  missing: boolean;
  offscreen: boolean;
  showNudge: boolean;
  onAck: () => void;
  onSkip: () => void;
  onRestartSection: () => void;
  onShowTarget: () => void;
}

function StepActions({ step, missing, offscreen, showNudge, onAck, onSkip, onRestartSection, onShowTarget }: StepActionsProps) {
  return (
    <>
      {offscreen && !missing && (
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onShowTarget}>
          Muéstrame dónde
        </Button>
      )}
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
    </>
  );
}
