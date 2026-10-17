import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/presentation/components/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import type { PaginatedResult } from '@/config/api.types';

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface PaginationProps {
  result: Pick<PaginatedResult<unknown>, 'page' | 'pageSize' | 'totalCount'>;
  onPageChange: (page: number) => void;
  // Opcional (CLAUDE.md sección 12 — prop con default que preserva el
  // comportamiento anterior): si no se pasa, no se muestra el selector de
  // tamaño de página, igual que antes de este cambio.
  onPageSizeChange?: (pageSize: number) => void;
}

// Arma la lista de páginas a mostrar con elipsis, siempre incluyendo la
// primera, la última, la actual y sus vecinas inmediatas — el resto se
// colapsa en "..." (mismo patrón que cualquier paginador shadcn/ui).
function buildPageList(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && value - previous > 1) result.push('ellipsis');
    result.push(value);
  });
  return result;
}

export function Pagination({ result, onPageChange, onPageSizeChange }: PaginationProps) {
  const page = result.page ?? 1;
  const pageSize = result.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(result.totalCount / pageSize));
  const pageList = buildPageList(page, totalPages);

  return (
    <div className="flex flex-col gap-3 px-1 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span>
          Página <span className="font-medium text-foreground">{page}</span> de {totalPages} ·{' '}
          {result.totalCount} resultados
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap">Por página</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="h-8 w-18">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pageList.map((item, index) =>
          item === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-muted-foreground/60">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'default' : 'outline'}
              size="icon"
              className="size-8"
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
