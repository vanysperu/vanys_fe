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
  // Opcional: texto secundario a la derecha (ej. el SKU o el código de un
  // producto). También cuenta para la búsqueda local.
  hint?: string;
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
  // Opcional (mismo criterio de "prop con default que preserva el
  // comportamiento anterior"): si se manda, se agrega un primer ítem fijo
  // en la lista para volver a "sin selección" — antes, un select opcional
  // (ej. Cotización/Orden de compra en "Nuevo movimiento de caja") no tenía
  // forma de deshacerse una vez elegida una opción (bug reportado por QA).
  onClear?: () => void;
  clearLabel?: string;
  // Opcional: búsqueda en el SERVIDOR (listas grandes, ej. productos). Con
  // `onSearchChange` la pantalla recibe lo escrito y manda en `options` los
  // resultados; `serverSearch` apaga el filtro local para no volver a filtrar
  // lo que ya filtró la API (que puede buscar por campos que no se muestran,
  // como el código). Sin estas props, todo funciona como antes.
  onSearchChange?: (text: string) => void;
  serverSearch?: boolean;
  isSearching?: boolean;
  // Texto del botón cuando la opción elegida no está entre los resultados
  // actuales de la búsqueda.
  selectedLabel?: string;
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
  onClear,
  clearLabel = 'Ninguna',
  onSearchChange,
  serverSearch = false,
  isSearching = false,
  selectedLabel,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearchState] = useState('');
  const setSearch = (text: string) => {
    setSearchState(text);
    onSearchChange?.(text);
  };
  const selected = options.find((option) => option.value === value);
  const triggerLabel = selected?.label ?? (value ? (selectedLabel ?? value) : undefined);
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
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Al cerrar sin elegir, la próxima vez arranca sin búsqueda.
        if (!next && search) setSearch('');
      }}
    >
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
            !triggerLabel && 'text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 truncate">{triggerLabel ?? placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[8rem] p-0" align="start">
        <Command shouldFilter={!serverSearch}>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList>
            {!showCustomValueOption && <CommandEmpty>{isSearching ? 'Buscando…' : emptyText}</CommandEmpty>}
            <CommandGroup>
              {onClear && (
                <CommandItem
                  value={`__clear__${clearLabel}`}
                  onSelect={() => {
                    onClear();
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', !value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 truncate text-muted-foreground">{clearLabel}</span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.hint ? `${option.label} ${option.hint}` : option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setSearch('');
                    setOpen(false);
                  }}
                >
                  <Check className={cn('size-4', option.value === value ? 'opacity-100' : 'opacity-0')} />
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.hint && <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">{option.hint}</span>}
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
