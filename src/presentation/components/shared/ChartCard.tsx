import { BarChart3, Table2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  // Leyenda (solo si hay 2 o más series; una sola serie la nombra el título).
  legend?: ReactNode;
  children: ReactNode;
  // Versión en tabla del mismo dato: toda gráfica tiene su tabla (se puede
  // leer sin pasar el mouse y sin depender del color).
  table: ReactNode;
  isEmpty?: boolean;
  emptyText?: string;
  className?: string;
  testId?: string;
}

type CardView = 'chart' | 'table';

// Tarjeta de una gráfica: título, leyenda y el interruptor Gráfico / Tabla.
export function ChartCard({
  title,
  description,
  legend,
  children,
  table,
  isEmpty = false,
  emptyText = 'Sin datos en este periodo',
  className,
  testId,
}: ChartCardProps) {
  const [view, setView] = useState<CardView>('chart');

  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm', className)} data-testid={testId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {!isEmpty && (
          <div className="flex shrink-0 items-center rounded-lg border p-0.5" role="group" aria-label={`Vista de "${title}"`}>
            <ViewButton active={view === 'chart'} onClick={() => setView('chart')} icon={BarChart3} label="Gráfico" />
            <ViewButton active={view === 'table'} onClick={() => setView('table')} icon={Table2} label="Tabla" />
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="flex min-h-40 flex-1 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {emptyText}
        </div>
      )}
      {!isEmpty && view === 'chart' && (
        <>
          {legend && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">{legend}</div>}
          {children}
        </>
      )}
      {!isEmpty && view === 'table' && table}
    </section>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof BarChart3;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

// Clave de la leyenda: un rectángulo para barras, una línea corta para
// líneas (la clave imita la marca de la gráfica). El texto nunca va en el
// color de la serie: la identidad la da la marca de al lado.
export function ChartLegendKey({ color, label, mark = 'bar' }: { color: string; label: string; mark?: 'bar' | 'line' }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn('inline-block shrink-0', mark === 'bar' ? 'size-2.5 rounded-[2px]' : 'h-0.5 w-3.5 rounded-full')}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
