import { AlertTriangle, PackageSearch } from 'lucide-react';

import { formatDateTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import type { ProductStockLookup } from '@/modules/supplierStock/types/supplierStock.types';

const numberFormatter = new Intl.NumberFormat('es-PE');

interface ProductStockLineProps {
  stock: ProductStockLookup | undefined;
  // Cantidad pedida en el item: si el stock no alcanza, se marca en rojo.
  quantity: number;
  // Color elegido: si la fuente tiene stock por color, se muestra ese.
  color?: string | null;
}

// Stock de proveedores de un producto, debajo de su fila en Nueva cotización
// (Sprint 2, ítem 6, pedido del usuario): cada Excel por separado y la suma,
// "no combinados".
export function ProductStockLine({ stock, quantity, color }: ProductStockLineProps) {
  if (!stock) return null;
  if (stock.sources.length === 0) {
    return (
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="product-stock-line">
        <PackageSearch className="size-3" aria-hidden />
        Sin stock en los Excel de proveedores
      </p>
    );
  }

  // Con color elegido, cada fuente aporta lo de ese color (si lo distingue).
  const perSource = stock.sources.map((source) => {
    const forColor = color ? source.byColor.find((entry) => entry.color.toUpperCase() === color.toUpperCase()) : undefined;
    return { ...source, shown: forColor ? forColor.quantity : source.quantity, byThisColor: Boolean(forColor) };
  });
  const total = perSource.reduce((sum, source) => sum + source.shown, 0);
  const isShort = quantity > 0 && total < quantity;
  const isStale = stock.sources.some((source) => source.stale);
  const oldest = stock.sources
    .map((source) => source.updatedAt)
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

  return (
    <div className="space-y-0.5 text-[11px]" data-testid="product-stock-line">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <PackageSearch className="size-3 text-muted-foreground" aria-hidden />
        {perSource.map((source) => (
          <span key={source.sourceId} title={source.supplierName ?? undefined}>
            <span className="text-muted-foreground">{source.sourceName}:</span>{' '}
            <span className="font-mono-nums font-medium">{numberFormatter.format(source.shown)}</span>
            {source.quantityTexts.length > 0 && <span className="text-muted-foreground"> (+ {source.quantityTexts.join(', ')})</span>}
          </span>
        ))}
        <span className={cn('font-semibold', isShort ? 'text-destructive' : 'text-[var(--success)]')}>
          Total{color && perSource.some((source) => source.byThisColor) ? ` ${color}` : ''}: {numberFormatter.format(total)}
        </span>
        {isShort && <span className="text-destructive">no alcanza para {numberFormatter.format(quantity)}</span>}
      </p>
      {(isStale || oldest) && (
        <p className={cn('flex items-center gap-1', isStale ? 'text-warning' : 'text-muted-foreground')}>
          {isStale && <AlertTriangle className="size-3" aria-hidden />}
          {isStale ? 'Dato de más de 24 h' : 'Actualizado'}
          {oldest ? ` · ${formatDateTime(oldest)}` : ''}
        </p>
      )}
    </div>
  );
}
