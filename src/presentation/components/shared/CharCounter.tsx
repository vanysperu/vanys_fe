import { cn } from '@/lib/utils';

interface CharCounterProps {
  value: string | undefined;
  max: number;
}

// Contador "usados/máximo" para campos de texto libre con límite — se
// pone en rojo cerca del tope para avisar antes de que el navegador
// simplemente deje de aceptar más letras (maxLength en el input/textarea).
export function CharCounter({ value, max }: CharCounterProps) {
  const length = value?.length ?? 0;
  const isNearLimit = length >= max * 0.9;

  return (
    <p className={cn('text-right text-[11px] text-muted-foreground', isNearLimit && 'font-medium text-destructive')}>
      {length}/{max}
    </p>
  );
}
