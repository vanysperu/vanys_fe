import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import type { StatDelta } from '@/lib/statDelta';
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
}

const TONE_CLASS = {
  good: 'text-viz-delta-good',
  bad: 'text-destructive',
  neutral: 'text-muted-foreground',
} as const;

const DIRECTION_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

// Indicador (stat tile): etiqueta, cifra y variación. La variación nunca
// depende solo del color: siempre lleva ícono y texto ("Subió 12 %").
export function StatTile({ label, value, delta, comparisonLabel, caption, hero = false, className, testId }: StatTileProps) {
  const DeltaIcon = delta ? DIRECTION_ICON[delta.direction] : null;

  return (
    <div className={cn('flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm', className)} data-testid={testId}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
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
