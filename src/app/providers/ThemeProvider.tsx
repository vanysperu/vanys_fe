import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

// Solo dos modos: día (claro) y noche (oscuro).
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'grulla-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Sin preferencia guardada (primer ingreso, o el "system" que guardaba la
// versión anterior del botón) se arranca con el modo del sistema operativo;
// desde el primer clic queda fijo el que elija el usuario. Misma regla que
// el script de index.html, que pinta el tema antes de que cargue React.
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return getSystemTheme();
}

// Provider de tema global: persiste la preferencia en localStorage y aplica
// la clase `dark` al <html> para que Tailwind (v4, @custom-variant dark
// (&:is(.dark *))) resuelva los tokens de color correctos en toda la app
// (CLAUDE.md sección 7).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // La clase del <html> vive fuera de React: se sincroniza acá.
  useEffect(() => {
    window.document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: (next) => {
        setThemeState(next);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
