import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'grulla-theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyThemeClass(resolved: 'light' | 'dark') {
  const root = window.document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
}

// Provider de tema global: persiste la preferencia (light/dark/system) en
// localStorage y aplica la clase `dark` al <html> para que Tailwind (v4,
// @custom-variant dark (&:is(.dark *))) resuelva los tokens de color
// correctos en toda la app (CLAUDE.md sección 7).
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'system' ? getSystemTheme() : theme,
  );

  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    // En modo 'system' seguimos los cambios de preferencia del SO en vivo.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
