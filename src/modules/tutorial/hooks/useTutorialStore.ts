import { create } from 'zustand';

import type { ActiveLesson, LessonContext } from '@/modules/tutorial/types/tutorial.types';

// Estado de cliente puro (la lección en curso), por eso zustand y no React
// Query (CLAUDE.md §7). localStorage solo sirve para retomar la lección si la
// persona recarga la página; el avance real se guarda en el backend.
const ACTIVE_KEY = 'tutorial_active_lesson';
// Lección que se pidió desde la cuenta real: se arranca al entrar a la práctica.
const PENDING_KEY = 'tutorial_pending_lesson';

const readActive = (): ActiveLesson | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveLesson;
    // Al recargar se retoma desde el último punto seguro (no a mitad de un formulario).
    return { ...parsed, stepIndex: parsed.floor };
  } catch {
    return null;
  }
};

const persist = (active: ActiveLesson | null) => {
  try {
    if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    // Sin almacenamiento (modo privado): la lección sigue, solo no se retoma al recargar.
  }
};

interface TutorialState {
  active: ActiveLesson | null;
  // Lección recién terminada: muestra la tarjeta de felicitación.
  finishedCode: string | null;
  start: (code: string, context: LessonContext) => void;
  goTo: (stepIndex: number, floor?: number) => void;
  finish: () => void;
  stop: () => void;
  dismissFinished: () => void;
}

export const useTutorialStore = create<TutorialState>((set, get) => ({
  active: readActive(),
  finishedCode: null,
  start: (code, context) => {
    const active: ActiveLesson = { code, stepIndex: 0, floor: 0, context };
    persist(active);
    set({ active, finishedCode: null });
  },
  goTo: (stepIndex, floor) => {
    const current = get().active;
    if (!current) return;
    const active: ActiveLesson = { ...current, stepIndex, floor: floor ?? current.floor };
    persist(active);
    set({ active });
  },
  finish: () => {
    const code = get().active?.code ?? null;
    persist(null);
    set({ active: null, finishedCode: code });
  },
  stop: () => {
    persist(null);
    set({ active: null });
  },
  dismissFinished: () => set({ finishedCode: null }),
}));

export const pendingLesson = {
  set: (code: string) => {
    try {
      localStorage.setItem(PENDING_KEY, code);
    } catch {
      // Sin almacenamiento: la persona elige la lección a mano en "Aprender".
    }
  },
  take: (): string | null => {
    try {
      const code = localStorage.getItem(PENDING_KEY);
      localStorage.removeItem(PENDING_KEY);
      return code;
    } catch {
      return null;
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(PENDING_KEY);
      localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Nada que limpiar.
    }
  },
};
