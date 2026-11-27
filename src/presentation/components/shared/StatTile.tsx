import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { StatDelta } from '@/lib/statDelta';
import { TONE_BAR, TONE_CHIP, type Tone } from '@/lib/tones';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: string;
  // Variación vs. un periodo anterior (ya calculada, ver lib/statDelta).
  delta?: StatDelta | null;
  // Contra qué se compara, ej. "vs. 23/08 – 21/09".
  comparisonLabel?: string;
  caption?: ReactNode;
  // La cifra principal del tablero (una sola por vista): número grande.
  hero?: boolean;
  className?: string;
  testId?: string;
  // Color e ícono (27-nov, "colores vivos"): barra de color arriba y el ícono
  // sobre fondo suave. Opcionales: sin ellos se ve como antes.
  tone?: Tone;
  icon?: LucideIcon;
}

const TONE_CLASS = {
  good: 'text-viz-delta-good',
  bad: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const;

const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

// Indicador (stat tile): etiqueta, cifra y variación. La variación nunca
// depende solo del color: siempre lleva ícono y texto ("Subió 12 %").
export function StatTile({ label, value, delta, comparisonLabel, caption, hero = false, className, testId, tone, icon: Icon }: StatTileProps) {
  const DeltaIcon = delta ? DIRECTION_ICON[delta.direction] : null;

  return (
    <div
      className={cn(
        'relative flex flex-col gap-1 overflow-hidden rounded-xl border bg-card p-4 shadow-sm',
        tone && "before:absolute before:inset-x-0 before:top-0 before:h-1 before:content-['']",
        tone && TONE_BAR[tone],
        className,
      )}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span aria-hidden className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE_CHIP[tone ?? 'blue'])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p
        className={cn(
          'font-semibold tracking-tight text-foreground',
          hero ? 'text-4xl leading-tight sm:text-5xl' : 'text-2xl',
        )}
      >
        {value}
      </p>
      {delta && DeltaIcon && (
        <p className="flex flex-wrap items-center gap-x-1 text-xs">
          <span className={cn('inline-flex items-center gap-0.5 font-medium', TONE_CLASS[delta.tone])}>
            <DeltaIcon className="size-3.5" aria-hidden />
            {delta.text}
          </span>
          {comparisonLabel && <span className="text-muted-foreground">{comparisonLabel}</span>}
        </p>
      )}
      {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
    </div>
  );
}
