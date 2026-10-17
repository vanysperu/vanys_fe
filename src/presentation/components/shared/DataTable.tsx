import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Input } from '@/presentation/components/shared/ui/input';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { MultiSelect, type MultiSelectOption } from '@/presentation/components/shared/MultiSelect';
import { cn } from '@/lib/utils';

export interface DataTableColumn<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right';
  // Ordenamiento opcional: si no se marca `sortable`, la columna se
  // comporta exactamente igual que antes (sin ícono, sin click). `sortKey`
  // permite que el parámetro que espera el backend (orderBy) difiera del
  // texto mostrado en el header.
  sortable?: boolean;
  sortKey?: string;
  // Filtro opcional por columna: mismo criterio, `filterKey` cubre el caso
  // en que el nombre del parámetro de la API no coincide con el header.
  filterable?: boolean;
  filterKey?: string;
  // Opcional (retrocompatible: default 'text', mismo <Input> de siempre).
  // 'multiselect' cambia el filtro de columna a un MultiSelect de
  // checkboxes (catálogos cortos: estado, categoría, ámbito, etc.), el
  // valor viajado en `columnFilters` sigue siendo un string, acá codificado
  // como lista separada por comas.
  filterType?: 'text' | 'multiselect';
  filterOptions?: MultiSelectOption[];
}

type SortDirection = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  skeletonRows?: number;
  // Estado de ordenamiento elevado al padre (mismo patrón que Pagination:
  // el estado vive en la página, DataTable solo lo refleja y avisa cambios).
  sortBy?: string;
  sortDir?: SortDirection;
  onSortChange?: (key: string, dir: SortDirection | undefined) => void;
  // Estado de filtros por columna, también elevado al padre.
  columnFilters?: Record<string, string>;
  onColumnFilterChange?: (key: string, value: string) => void;
}

// Input de filtro por columna con debounce interno simple (sin librerías
// nuevas, CLAUDE.md sección 7): evita disparar un fetch por cada tecla.
function ColumnFilterInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (draft !== value) onChange(draft);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      placeholder="Filtrar..."
      className="h-7 text-xs font-normal normal-case"
      onClick={(event) => event.stopPropagation()}
    />
  );
}

// Filtro de columna tipo multiselect: codifica/decodifica la lista elegida
// como CSV dentro del mismo `columnFilters[key]` string que ya usaba el
// filtro de texto, para no cambiar el contrato que consumen las páginas.
function ColumnMultiSelectFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MultiSelectOption[];
  onChange: (value: string) => void;
}) {
  const selected = value ? value.split(',').filter(Boolean) : [];

  return (
    <div onClick={(event) => event.stopPropagation()} className="w-full">
      <MultiSelect
        options={options}
        value={selected}
        onChange={(values) => onChange(values.join(','))}
        placeholder="Filtrar..."
        className="h-7 min-h-7 py-0 text-xs font-normal normal-case"
      />
    </div>
  );
}

// Tabla genérica reutilizada por todos los módulos: un solo lugar para el
// estado de carga (skeleton), el estado vacío y la animación de entrada de
// filas — evita reimplementar el mismo <table> en cada página de listado.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  skeletonRows = 5,
  sortBy,
  sortDir,
  onSortChange,
  columnFilters,
  onColumnFilterChange,
}: DataTableProps<T>) {
  // Ciclo asc -> desc -> sin orden, igual que la mayoría de tablas shadcn.
  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const key = column.sortKey ?? column.header;
    if (sortBy !== key) return onSortChange(key, 'asc');
    if (sortDir === 'asc') return onSortChange(key, 'desc');
    return onSortChange(key, undefined);
  };

  return (
    // overflow-x-auto en el wrapper interno: si las columnas no caben (tabla
    // ancha o pantalla chica) se puede scrollear, no se recorta sin forma de
    // verlo — overflow-hidden en el borde exterior solo recorta las esquinas
    // cuadradas del <table>, nunca bloquea el scroll horizontal.
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {columns.map((column) => {
              const key = column.sortKey ?? column.header;
              const isActiveSort = column.sortable && sortBy === key;
              const SortIcon = isActiveSort ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

              return (
                <th
                  key={column.header}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                    column.align === 'right' ? 'text-right' : 'text-left',
                    column.className,
                  )}
                >
                  <div className={cn('flex flex-col gap-1.5', column.align === 'right' ? 'items-end' : 'items-start')}>
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(column)}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {column.header}
                        <SortIcon className={cn('size-3.5', isActiveSort ? 'text-foreground' : 'text-muted-foreground/60')} />
                      </button>
                    ) : (
                      column.header
                    )}
                    {column.filterable &&
                      onColumnFilterChange &&
                      (column.filterType === 'multiselect' && column.filterOptions ? (
                        <ColumnMultiSelectFilter
                          value={columnFilters?.[column.filterKey ?? key] ?? ''}
                          options={column.filterOptions}
                          onChange={(value) => onColumnFilterChange(column.filterKey ?? key, value)}
                        />
                      ) : (
                        <ColumnFilterInput
                          value={columnFilters?.[column.filterKey ?? key] ?? ''}
                          onChange={(value) => onColumnFilterChange(column.filterKey ?? key, value)}
                        />
                      ))}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: skeletonRows }).map((_, index) => (
              <tr key={index} className="border-b last:border-0">
                {columns.map((column) => (
                  <td key={column.header} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-40" />
                  </td>
                ))}
              </tr>
            ))}

          {!isLoading &&
            rows.map((row, index) => (
              <motion.tr
                key={rowKey(row)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                className="border-b last:border-0 transition-colors hover:bg-muted/40"
              >
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={cn('px-4 py-3', column.align === 'right' ? 'text-right' : undefined, column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </motion.tr>
            ))}
        </tbody>
      </table>
      </div>

      {!isLoading && rows.length === 0 && (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      )}
    </div>
  );
}
