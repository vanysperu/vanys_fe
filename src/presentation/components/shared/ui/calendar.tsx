import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

const WEEKDAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export interface DateRange {
  from?: Date;
  to?: Date;
}

// Predicados reusables para la prop `disabled` — "activar y desactivar
// cosas como fechas futuras, pasadas, o mayor/menor a una fecha" (pedido
// explícito del usuario). Se combinan con `combineDisabled(...)`.
export const disableFuture = (date: Date): boolean => date.getTime() > startOfDay(new Date()).getTime();
export const disablePast = (date: Date): boolean => date.getTime() < startOfDay(new Date()).getTime();
export const disableAfter = (max: Date) => (date: Date): boolean => date.getTime() > startOfDay(max).getTime();
export const disableBefore = (min: Date) => (date: Date): boolean => date.getTime() < startOfDay(min).getTime();
export function combineDisabled(...matchers: Array<((date: Date) => boolean) | undefined>) {
  const active = matchers.filter((matcher): matcher is (date: Date) => boolean => Boolean(matcher));
  return (date: Date) => active.some((matcher) => matcher(date));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date | undefined, b: Date | undefined): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface MonthCell {
  date: Date;
  outside: boolean;
}

// Grilla de 6 semanas (Lun-Dom) que SIEMPRE incluye el mes completo más los
// días del mes anterior/siguiente necesarios para rellenar semanas enteras.
function buildMonthGrid(year: number, month: number): MonthCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Lunes=0..Domingo=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrevMonth - startWeekday + 1 + i;
    cells.push({ date: new Date(year, month - 1, day), outside: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay), outside: true });
    nextDay += 1;
  }
  return cells;
}

interface CalendarBaseProps {
  disabled?: (date: Date) => boolean;
  // Rango de años mostrado en el selector rápido de año (pedido explícito:
  // "poner año mes" sin tener que darle a la flechita 50 veces).
  fromYear?: number;
  toYear?: number;
  defaultMonth?: Date;
  className?: string;
}

interface CalendarSingleProps extends CalendarBaseProps {
  mode: 'single';
  selected: Date | undefined;
  onSelect: (date: Date) => void;
}

interface CalendarRangeProps extends CalendarBaseProps {
  mode: 'range';
  selected: DateRange | undefined;
  onSelect: (range: DateRange) => void;
}

export type CalendarProps = CalendarSingleProps | CalendarRangeProps;

// Calendario propio (sin librerías nuevas, CLAUDE.md sección 7): selector
// rápido de mes/año + grilla de días, modo "single" (una fecha) o "range"
// (rango, un solo selector — nunca dos inputs de desde/hasta sueltos). La
// prop `disabled` es un predicado libre: `disableFuture`/`disablePast`/
// `disableAfter(x)`/`disableBefore(x)` ya cubren los casos pedidos
// ("fechas futuras, pasadas, o mayor a esa cosas así").
export function Calendar(props: CalendarProps) {
  const { disabled, fromYear, toYear, defaultMonth, className } = props;
  const today = new Date();
  const anchor =
    defaultMonth ??
    (props.mode === 'single' ? props.selected : props.selected?.from) ??
    today;

  const [viewYear, setViewYear] = useState(anchor.getFullYear());
  const [viewMonth, setViewMonth] = useState(anchor.getMonth());

  const minYear = fromYear ?? today.getFullYear() - 100;
  const maxYear = toYear ?? today.getFullYear() + 10;
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);

  const goToMonth = (deltaMonths: number) => {
    const next = new Date(viewYear, viewMonth + deltaMonths, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleDayClick = (date: Date) => {
    if (disabled?.(date)) return;

    if (props.mode === 'single') {
      props.onSelect(date);
      return;
    }

    const current = props.selected;
    const hasCompleteRange = current?.from && current?.to;
    if (!current?.from || hasCompleteRange) {
      props.onSelect({ from: date, to: undefined });
      return;
    }
    if (date.getTime() < current.from.getTime()) {
      props.onSelect({ from: date, to: current.from });
      return;
    }
    props.onSelect({ from: current.from, to: date });
  };

  const isSelected = (date: Date): boolean => {
    if (props.mode === 'single') return isSameDay(date, props.selected);
    return isSameDay(date, props.selected?.from) || isSameDay(date, props.selected?.to);
  };

  const isInRange = (date: Date): boolean => {
    if (props.mode !== 'range') return false;
    const { from, to } = props.selected ?? {};
    if (!from || !to) return false;
    return date.getTime() > from.getTime() && date.getTime() < to.getTime();
  };

  const cells = buildMonthGrid(viewYear, viewMonth);

  return (
    <div className={cn('w-72 select-none', className)}>
      <div className="mb-3 flex items-center gap-1">
        <Button type="button" variant="outline" size="icon" className="size-7 shrink-0" onClick={() => goToMonth(-1)}>
          <ChevronLeft className="size-4" />
        </Button>

        <Select value={String(viewMonth)} onValueChange={(value) => setViewMonth(Number(value))}>
          <SelectTrigger className="h-7 flex-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_LABELS.map((label, index) => (
              <SelectItem key={label} value={String(index)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(viewYear)} onValueChange={(value) => setViewYear(Number(value))}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" variant="outline" size="icon" className="size-7 shrink-0" onClick={() => goToMonth(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1 font-medium">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(({ date, outside }) => {
          const isDisabled = disabled?.(date) ?? false;
          const selected = isSelected(date);
          const inRange = isInRange(date);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => handleDayClick(date)}
              // data-outside: dos celdas pueden mostrar el mismo número de
              // día (ej. el 29 de septiembre como relleno del mes anterior Y
              // el 29 de octubre del mes real) — sin este atributo, un
              // locator por texto ("29") podía matchear la celda de relleno
              // en vez de la del mes mostrado (bug detectado corriendo los
              // e2e: un movimiento quedaba guardado un mes antes del
              // pedido).
              data-outside={outside || undefined}
              className={cn(
                'mx-auto flex size-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                outside && 'text-muted-foreground/40',
                isToday && !selected && 'font-semibold text-primary',
                inRange && 'rounded-none bg-accent',
                selected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                isDisabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
