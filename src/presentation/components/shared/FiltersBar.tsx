import { FilterX } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/presentation/components/shared/ui/button';

interface FiltersBarProps {
  children: ReactNode;
  // Si hay algún filtro activo, aparece "Limpiar filtros".
  hasActiveFilters?: boolean;
  onClear?: () => void;
}

// Fila de filtros encima de una tabla (fechas, estado, persona...) — mismo
// layout en todas las listas para que se usen igual en cualquier pantalla.
export function FiltersBar({ children, hasActiveFilters = false, onClear }: FiltersBarProps) {
  return (
    // Celular: cada filtro ocupa todo el ancho (max-sm:*:w-full) — con sus
    // anchos fijos de escritorio quedaban apilados en columnas desparejas.
    <div className="flex flex-wrap items-center gap-2 max-sm:*:w-full" data-testid="filters-bar">
      {children}
      {hasActiveFilters && onClear && (
        <Button type="button" variant="ghost" size="sm" onClick={onClear}>
          <FilterX className="size-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
