import { create } from 'zustand';

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

// Datos mínimos de la sesión que ya vienen en la respuesta de /signin
// (LoginResult, grulla_be) — se guardan aquí solo para poder mostrarlos en
// el bloque de usuario del sidebar tras recargar la página, sin volver a
// pedirle nada nuevo al backend.
export interface AuthUser {
  fullName: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
  clearToken: () => void;
}

// Defensa adicional (belt-and-suspenders) además del filtro que ya hace el
// backend: si por lo que sea llegara un fullName con literales "null"/
// "undefined" colados (ej. concatenación manual en otro punto, dato viejo
// en localStorage de una versión anterior), se limpian palabra por palabra
// antes de guardarlo o mostrarlo.
function sanitizeFullName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter((part) => part && part.toLowerCase() !== 'null' && part.toLowerCase() !== 'undefined')
    .join(' ')
    .trim();
}

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    return { ...parsed, fullName: sanitizeFullName(parsed.fullName) };
  } catch {
    return null;
  }
}

// Estado de cliente puro (no es data de servidor, por eso zustand y no React
// Query — CLAUDE.md sección 7). localStorage es solo la persistencia entre
// recargas; el estado en memoria es la fuente que hace reactivo el switch
// Private/Public de app/routing.
export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  user: readStoredUser(),
  setToken: (token) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ token });
  },
  setUser: (user) => {
    const sanitized = { ...user, fullName: sanitizeFullName(user.fullName) };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sanitized));
    set({ user: sanitized });
  },
  clearToken: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    set({ token: null, user: null });
  },
}));
