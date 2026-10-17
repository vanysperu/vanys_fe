import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/presentation/components/shared/ui/badge';
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

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

// Mismo patrón que SearchableSelect (Popover + Command con buscador), pero
// permite elegir varios valores a la vez con checkboxes — pensado para
// filtros de columna de catálogo corto (estado, categoría, ámbito, etc.)
// donde el usuario quiere "está en esta lista" en vez de un solo valor.
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecciona opciones',
  emptyText = 'Sin resultados',
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleValue = (optionValue: string) => {
    const isSelected = value.includes(optionValue);
    onChange(isSelected ? value.filter((item) => item !== optionValue) : [...value, optionValue]);
  };

  const selectedLabels = options.filter((option) => value.includes(option.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-9 w-full min-w-0 justify-between font-normal', value.length === 0 && 'text-muted-foreground', className)}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 truncate text-left">
            {selectedLabels.length === 0 ? (
              placeholder
            ) : selectedLabels.length <= 2 ? (
              selectedLabels.map((option) => (
                <Badge key={option.value} variant="secondary" className="font-normal">
                  {option.label}
                </Badge>
              ))
            ) : (
              `${selectedLabels.length} seleccionados`
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[10rem] p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem key={option.value} value={option.label} onSelect={() => toggleValue(option.value)}>
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-sm border',
                        isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
