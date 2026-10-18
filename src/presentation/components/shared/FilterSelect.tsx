import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  // undefined = sin filtro ("Todos").
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  options: FilterSelectOption[];
  allLabel?: string;
  // Sin opción "Todos": para filtros que siempre tienen un valor (ej. el
  // estado de las deudas, que por defecto muestra solo las pendientes).
  hideAll?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

// Valor interno para "Todos" (Radix no admite value="").
const ALL_VALUE = '__all__';

// Filtro de listado de una sola opción con "Todos" — el mismo patrón que ya
// usaban Cotizaciones/Órdenes de compra/Caja inline, ahora compartido para
// que todas las listas filtren igual (CLAUDE.md sección 7).
export function FilterSelect({
  value,
  onChange,
  options,
  allLabel = 'Todos',
  hideAll = false,
  className,
  id,
  'aria-label': ariaLabel,
}: FilterSelectProps) {
  return (
    <Select
      value={value ?? (hideAll ? undefined : ALL_VALUE)}
      onValueChange={(next) => onChange(next === ALL_VALUE ? undefined : next)}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('h-9 w-44', className)}>
        <SelectValue placeholder={allLabel} />
      </SelectTrigger>
      <SelectContent>
        {!hideAll && <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
