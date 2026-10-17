import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/presentation/components/shared/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/components/shared/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  // Opcional (CLAUDE.md sección 12 — prop con default que preserva el
  // comportamiento anterior): si es true, cuando lo escrito no matchea
  // ninguna opción existente se ofrece un ítem extra "Usar “texto”" que
  // permite cargar un valor libre (ej. una categoría nueva de variable
  // general que todavía no existe en el catálogo).
  allowCustomValue?: boolean;
}

// Reemplazo de <Select> para listas largas cargadas de la API (clientes,
// productos, empresas, usuarios, etc.) — el <Select> nativo de shadcn no
// tiene búsqueda, así que elegir un ítem entre cientos obliga a scrollear
// a ciegas. Se arma sobre Popover + Command (cmdk), mismos primitivos que
// shadcn publica para este patrón, y expone el mismo contrato
// value/onChange que ya usan las pantallas (string | undefined),
// evitando tocar los schemas de Zod o la lógica de los formularios.
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona una opción',
  emptyText = 'Sin resultados',
  disabled,
  className,
  id,
  allowCustomValue = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((option) => option.value === value);
  // Si lo tipeado no matchea ninguna opción (por label ni por value), se
  // ofrece cargarlo tal cual como valor libre — cubre catálogos que crecen
  // con el uso (ej. categorías de variable general).
  const trimmedSearch = search.trim();
  const hasExactMatch = options.some(
    (option) => option.label.toLowerCase() === trimmedSearch.toLowerCase() || option.value === trimmedSearch,
  );
  const showCustomValueOption = allowCustomValue && trimmedSearch.length > 0 && !hasExactMatch;

  const handleSelectCustomValue = () => {
    onChange(trimmedSearch);
    setSearch('');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-full min-w-0 justify-between font-normal',
            !selected && !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 truncate">{selected ? selected.label : value || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[8rem] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            {!showCustomValueOption && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 truncate">{option.label}</span>
                </CommandItem>
              ))}
              {showCustomValueOption && (
                <CommandItem value={`__custom__${trimmedSearch}`} onSelect={handleSelectCustomValue}>
                  <Check className="size-4 opacity-0" />
                  <span className="min-w-0 truncate">Usar &ldquo;{trimmedSearch}&rdquo;</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
