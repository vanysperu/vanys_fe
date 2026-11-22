import { useAuthStore, type AuthUser } from '@/modules/auth/hooks/useAuthStore';
import { pendingLesson } from '@/modules/tutorial/hooks/useTutorialStore';
import type { PracticeSession } from '@/modules/tutorial/types/tutorial.types';

// Cambio de sesión del modo enseñanza (21-nov): la práctica usa la sesión de un
// usuario de práctica (otra empresa), y la sesión de la cuenta real se guarda
// aquí para volver a ella con un clic. Siempre con recarga completa: así no
// queda en memoria nada de la otra cuenta (caché, permisos).
const RETURN_KEY = 'tutorial_return_session';

interface ReturnSession {
  token: string;
  user: AuthUser | null;
}

const readReturnSession = (): ReturnSession | null => {
  try {
    const raw = localStorage.getItem(RETURN_KEY);
    return raw ? (JSON.parse(raw) as ReturnSession) : null;
  } catch {
    return null;
  }
};

// Entrar a la práctica. Desde la cuenta real se guarda esa sesión para volver;
// desde la propia práctica ("Reiniciar práctica") no se toca la guardada.
export function enterPracticeSession(session: PracticeSession, options: { fromPractice: boolean; lessonCode?: string }) {
  const auth = useAuthStore.getState();
  if (!options.fromPractice && auth.token) {
    localStorage.setItem(RETURN_KEY, JSON.stringify({ token: auth.token, user: auth.user } satisfies ReturnSession));
  }
  if (options.lessonCode) pendingLesson.set(options.lessonCode);
  auth.setToken(session.token);
  auth.setUser(session.user);
  window.location.assign('/aprender');
}

// Volver a la cuenta real (si no hay una guardada, se vuelve al login).
export function leavePracticeSession() {
  const saved = readReturnSession();
  forgetPracticeReturn();
  const auth = useAuthStore.getState();
  if (!saved) {
    auth.clearToken();
    window.location.assign('/login');
    return;
  }
  auth.setToken(saved.token);
  if (saved.user) auth.setUser(saved.user);
  window.location.assign('/aprender');
}

// Al cerrar sesión: que la próxima persona en este equipo nunca pueda "volver"
// a la cuenta de otra.
export function forgetPracticeReturn() {
  try {
    localStorage.removeItem(RETURN_KEY);
  } catch {
    // Sin almacenamiento: no había nada guardado.
  }
  pendingLesson.clear();
}
