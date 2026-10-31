import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import { Calendar, type DateRange } from '@/presentation/components/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/shared/ui/popover';

export type { DateRange };

interface DateRangePickerFieldProps {
  value: DateRange | undefined;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
  id?: string;
  className?: string;
}

const RANGE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function formatRange(range: DateRange | undefined, placeholder: string): string {
  if (!range?.from) return placeholder;
  if (!range.to) return RANGE_DISPLAY_FORMATTER.format(range.from);
  return `${RANGE_DISPLAY_FORMATTER.format(range.from)} – ${RANGE_DISPLAY_FORMATTER.format(range.to)}`;
}

// "Un solo selector de rango de fechas (no dos inputs separados de 'desde'/
// 'hasta')" — CLAUDE.md sección 7. Mismo Calendar que DateField, en modo
// "range": primer click arranca el rango, segundo click lo cierra, tercer
// click arranca uno nuevo.
export function DateRangePickerField({
  value,
  onChange,
  placeholder = 'Selecciona un rango de fechas',
  disabled,
  fromYear,
  toYear,
  id,
  className,
}: DateRangePickerFieldProps) {
  const [open, setOpen] = useState(false);
  // Rango a medio elegir (solo "desde"): se guarda acá y NO se le avisa al
  // padre hasta que se complete. Antes se avisaba en el primer clic, el padre
  // lo convertía en un rango de un día (desde = hasta) y el segundo clic, al
  // ver un rango ya "completo", arrancaba uno nuevo en vez de cerrarlo — no
  // había forma de elegir un rango (bug reportado por QA en Caja).
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const handleOpenChange = (next: boolean) => {
    // Cerrar con solo "desde" elegido filtra ese único día.
    if (!next && draft?.from) onChange({ from: draft.from, to: undefined });
    setDraft(undefined);
    setOpen(next);
  };

  const shown = draft ?? value;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('w-full justify-start font-normal', !shown?.from && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="size-4" />
          {formatRange(shown, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="range"
          selected={shown}
          onSelect={(range) => {
            if (!range.to) {
              setDraft(range);
              return;
            }
            setDraft(undefined);
            onChange(range);
            setOpen(false);
          }}
          disabled={disabled}
          fromYear={fromYear}
          toYear={toYear}
          defaultMonth={value?.from}
        />
      </PopoverContent>
    </Popover>
  );
}
