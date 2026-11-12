import { cn } from '@/lib/utils';

interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  // Texto accesible (lo que lee el lector de pantalla y la prueba e2e).
  label: string;
  disabled?: boolean;
  id?: string;
}

// Interruptor de encendido/apagado (CLAUDE.md sección 7: componente base de
// shared/). Genérico: no sabe qué prende. Primer uso: "Visible para el cliente"
// al compartir una cotización.
export function ToggleSwitch({ checked, onCheckedChange, label, disabled = false, id }: ToggleSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block size-5 rounded-full bg-background shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
