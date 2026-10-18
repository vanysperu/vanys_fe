import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { parseLocalIsoDate, toLocalIsoDate } from '@/lib/dateUtils';
import { DateRangePickerField } from '@/presentation/components/shared/DateRangePickerField';
import { Button } from '@/presentation/components/shared/ui/button';

export interface DateRangeValue {
  // "YYYY-MM-DD" (lo que espera el backend en dateFrom/dateTo).
  dateFrom?: string;
  dateTo?: string;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

// Filtro de listado por rango de fechas: un solo selector (CLAUDE.md sección
// 7) que entrega/recibe strings "YYYY-MM-DD" en hora local, más un botón
// para limpiarlo. Elegir un solo día filtra ese día (desde = hasta).
export function DateRangeFilter({ value, onChange, placeholder = 'Rango de fechas', className, id }: DateRangeFilterProps) {
  const hasValue = Boolean(value.dateFrom || value.dateTo);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <DateRangePickerField
        id={id}
        className="h-9 min-w-56"
        placeholder={placeholder}
        value={{ from: parseLocalIsoDate(value.dateFrom), to: parseLocalIsoDate(value.dateTo) }}
        onChange={(range) => {
          const dateFrom = range?.from ? toLocalIsoDate(range.from) : undefined;
          const dateTo = range?.to ? toLocalIsoDate(range.to) : dateFrom;
          onChange({ dateFrom, dateTo });
        }}
      />
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title="Quitar rango de fechas"
          onClick={() => onChange({})}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
