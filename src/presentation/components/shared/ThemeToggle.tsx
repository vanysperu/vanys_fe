import { Moon, Sun } from 'lucide-react';

import { useTheme } from '@/app/providers/ThemeProvider';
import { cn } from '@/lib/utils';

// Botón de día/noche de la barra superior (presente en toda pantalla
// autenticada). Solo dos modos (pedido explícito del usuario: antes rotaba
// entre claro, oscuro y "sistema", y ese tercer paso parecía una falla). El
// ícono muestra el modo actual; el texto de ayuda dice a cuál cambia.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Cambiar a modo día' : 'Cambiar a modo noche';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={label}
      aria-label={label}
      className={cn(
        'flex size-7 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {isDark ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </button>
  );
}
