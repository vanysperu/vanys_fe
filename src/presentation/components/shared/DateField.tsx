import { useState } from 'react';
import { CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import { Calendar } from '@/presentation/components/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/shared/ui/popover';

interface DateFieldProps {
  // "YYYY-MM-DD" (mismo formato que ya devolvía el <input type="date">
  // nativo que este componente reemplaza) — así no hay que tocar los
  // schemas de Zod ni la conversión a DD/MM/YYYY que ya hace cada form.
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  fromYear?: number;
  toYear?: number;
  id?: string;
  className?: string;
}

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DATE_DISPLAY_FORMATTER = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });

// Reemplaza el <input type="date"> nativo (pedido explícito del usuario:
// "componente de calendario no aplicado") por un selector consistente con
// el resto de la UI (Popover + Calendar propio, con selector rápido de
// mes/año y soporte para deshabilitar fechas futuras/pasadas).
export function DateField({ value, onChange, placeholder = 'Selecciona una fecha', disabled, fromYear, toYear, id, className }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn('w-full justify-start font-normal', !selectedDate && 'text-muted-foreground', className)}
        >
          <CalendarIcon className="size-4" />
          {selectedDate ? DATE_DISPLAY_FORMATTER.format(selectedDate) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(toIsoDate(date));
            setOpen(false);
          }}
          disabled={disabled}
          fromYear={fromYear}
          toYear={toYear}
          defaultMonth={selectedDate}
        />
      </PopoverContent>
    </Popover>
  );
}
