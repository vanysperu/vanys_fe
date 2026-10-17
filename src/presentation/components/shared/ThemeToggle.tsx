import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/providers/ThemeProvider';
import { cn } from '@/lib/utils';

// Toggle de tema visible en el sidebar (presente en toda pantalla autenticada).
// Cicla entre light -> dark -> system para dar acceso también a "seguir el
// sistema" sin agregar un dropdown extra (CLAUDE.md sección 7).
const THEME_ORDER = ['light', 'dark', 'system'] as const;

const THEME_META: Record<(typeof THEME_ORDER)[number], { icon: typeof Sun; label: string }> = {
  light: { icon: Sun, label: 'Tema claro' },
  dark: { icon: Moon, label: 'Tema oscuro' },
  system: { icon: Monitor, label: 'Tema del sistema' },
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = THEME_META[theme].icon;

  const handleClick = () => {
    const currentIndex = THEME_ORDER.indexOf(theme);
    const next = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length] ?? 'light';
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={THEME_META[theme].label}
      aria-label={THEME_META[theme].label}
      className={cn(
        'flex size-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
