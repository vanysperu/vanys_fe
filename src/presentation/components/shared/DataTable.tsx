import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { useIsMobile } from '@/presentation/hooks/use-mobile';
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
  // Opcional (default false): oculta la columna en la vista de tarjetas del
  // celular, para datos secundarios que en una pantalla chica solo estorban.
  // En escritorio la columna se ve siempre igual.
  hideOnMobile?: boolean;
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
  className = 'h-7 text-xs font-normal normal-case',
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
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
      className={className}
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
  className = 'h-7 min-h-7 py-0 text-xs font-normal normal-case',
}: {
  value: string;
  options: MultiSelectOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const selected = value ? value.split(',').filter(Boolean) : [];

  return (
    <div onClick={(event) => event.stopPropagation()} className="w-full">
      <MultiSelect
        options={options}
        value={selected}
        onChange={(values) => onChange(values.join(','))}
        placeholder="Filtrar..."
        className={className}
      />
    </div>
  );
}

// Valor del Select de orden que significa "sin ordenar" (Radix Select no
// acepta value="" en un ítem).
const NO_SORT_VALUE = '__none__';

type MobileControlsProps<T> = Pick<
  DataTableProps<T>,
  'columns' | 'sortBy' | 'sortDir' | 'onSortChange' | 'columnFilters' | 'onColumnFilterChange'
>;

// Celular: los filtros y el orden que en escritorio viven en el encabezado
// de cada columna se agrupan en un panel plegable arriba de las tarjetas
// (en la vista de tarjetas no hay encabezados donde ponerlos).
function MobileTableControls<T>({
  columns,
  sortBy,
  sortDir,
  onSortChange,
  columnFilters,
  onColumnFilterChange,
}: MobileControlsProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const filterColumns = onColumnFilterChange ? columns.filter((column) => column.filterable) : [];
  const sortColumns = onSortChange ? columns.filter((column) => column.sortable) : [];

  if (filterColumns.length === 0 && sortColumns.length === 0) return null;

  const activeCount =
    Object.values(columnFilters ?? {}).filter(Boolean).length + (sortBy && sortDir ? 1 : 0);
  const activeSort = sortBy && sortDir ? sortBy : NO_SORT_VALUE;

  const handleSortKeyChange = (key: string) => {
    if (!onSortChange) return;
    if (key === NO_SORT_VALUE) return onSortChange(sortBy ?? '', undefined);
    return onSortChange(key, sortDir ?? 'asc');
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium"
      >
        <SlidersHorizontal className="size-4 text-muted-foreground" />
        <span className="flex-1 text-left">Filtros y orden</span>
        {activeCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{activeCount}</span>
        )}
        <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="space-y-3 border-t px-4 py-3">
          {sortColumns.length > 0 && (
            <div className="space-y-1.5">
              <Label>Ordenar por</Label>
              <div className="flex gap-2">
                <Select value={activeSort} onValueChange={handleSortKeyChange}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SORT_VALUE}>Sin orden</SelectItem>
                    {sortColumns.map((column) => (
                      <SelectItem key={column.header} value={column.sortKey ?? column.header}>
                        {column.header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={activeSort === NO_SORT_VALUE}
                  aria-label={sortDir === 'desc' ? 'Orden descendente' : 'Orden ascendente'}
                  onClick={() => sortBy && onSortChange?.(sortBy, sortDir === 'asc' ? 'desc' : 'asc')}
                >
                  {sortDir === 'desc' ? <ArrowDown className="size-4" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
            </div>
          )}

          {filterColumns.map((column) => {
            const key = column.filterKey ?? column.sortKey ?? column.header;
            const value = columnFilters?.[key] ?? '';
            const onChange = (next: string) => onColumnFilterChange?.(key, next);

            return (
              <div key={column.header} className="space-y-1.5">
                <Label>{column.header}</Label>
                {column.filterType === 'multiselect' && column.filterOptions ? (
                  <ColumnMultiSelectFilter value={value} options={column.filterOptions} onChange={onChange} className="" />
                ) : (
                  <ColumnFilterInput value={value} onChange={onChange} className="" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Celular: cada fila se muestra como una tarjeta en vez de una fila de tabla
// (una tabla de 6+ columnas en 360 px obliga a deslizar de lado y no se lee).
// La primera columna hace de título; las columnas sin encabezado (las de
// acciones: editar, deshabilitar...) van al pie de la tarjeta, a la derecha;
// el resto se muestra como "Etiqueta: valor".
function MobileCardList<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  skeletonRows,
}: Pick<DataTableProps<T>, 'columns' | 'rows' | 'rowKey' | 'isLoading'> & { skeletonRows: number }) {
  const visibleColumns = columns.filter((column) => !column.hideOnMobile);
  const [titleColumn, ...restColumns] = visibleColumns;
  const fieldColumns = restColumns.filter((column) => column.header !== '');
  const actionColumns = restColumns.filter((column) => column.header === '');

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: Math.min(skeletonRows, 3) }).map((_, index) => (
          <div key={index} className="space-y-2.5 rounded-xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <motion.div
          key={rowKey(row)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
          className="rounded-xl border bg-card p-4 text-sm shadow-sm"
        >
          {titleColumn && <div className="min-w-0 font-medium break-words">{titleColumn.cell(row)}</div>}

          {fieldColumns.length > 0 && (
            <dl className="mt-3 space-y-2">
              {fieldColumns.map((column) => (
                <div key={column.header} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs text-muted-foreground">{column.header}</dt>
                  <dd className="min-w-0 text-right break-words">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          )}

          {actionColumns.length > 0 && (
            <div className="mt-3 flex items-center justify-end gap-1 border-t pt-2">
              {actionColumns.map((column, actionIndex) => (
                <div key={actionIndex}>{column.cell(row)}</div>
              ))}
            </div>
          )}
        </motion.div>
      ))}
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
  const isMobile = useIsMobile();

  // Ciclo asc -> desc -> sin orden, igual que la mayoría de tablas shadcn.
  const handleSortClick = (column: DataTableColumn<T>) => {
    if (!column.sortable || !onSortChange) return;
    const key = column.sortKey ?? column.header;
    if (sortBy !== key) return onSortChange(key, 'asc');
    if (sortDir === 'asc') return onSortChange(key, 'desc');
    return onSortChange(key, undefined);
  };

  // Se renderiza UN solo modo (tarjetas o tabla), no los dos ocultando uno
  // con CSS: duplicar el contenido haría que cada texto aparezca dos veces
  // en el DOM (lectores de pantalla, locators de Playwright en modo strict).
  if (isMobile) {
    return (
      <div className="space-y-2">
        <MobileTableControls
          columns={columns}
          sortBy={sortBy}
          sortDir={sortDir}
          onSortChange={onSortChange}
          columnFilters={columnFilters}
          onColumnFilterChange={onColumnFilterChange}
        />
        <MobileCardList columns={columns} rows={rows} rowKey={rowKey} isLoading={isLoading} skeletonRows={skeletonRows} />
        {!isLoading && rows.length === 0 && (
          <div className="rounded-xl border bg-card shadow-sm">
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
          </div>
        )}
      </div>
    );
  }

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
