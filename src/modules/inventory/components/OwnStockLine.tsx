import { Warehouse } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OwnStockLookup } from '@/modules/inventory/types/inventory.types';

const numberFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

// Stock propio de un producto en Nueva cotización (plan §8.4), junto al de
// proveedores: por almacén (del color elegido, si tiene) y el total.
export function OwnStockLine({ stock, quantity, color }: { stock: OwnStockLookup | undefined; quantity: number; color?: string | null }) {
  if (!stock) return null;
  const rows = stock.byWarehouse.filter((entry) => !color || !entry.color || entry.color.toUpperCase() === color.toUpperCase());
  const total = rows.reduce((sum, entry) => sum + entry.quantity, 0);
  const isShort = quantity > 0 && total < quantity;

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]" data-testid="own-stock-line">
      <Warehouse className="size-3 text-muted-foreground" aria-hidden />
      {rows.length === 0 && <span className="text-muted-foreground">Sin stock en tus almacenes</span>}
      {rows.map((entry) => (
        <span key={`${entry.warehouseId}|${entry.color}`}>
          <span className="text-muted-foreground">{entry.warehouseName}:</span>{' '}
          <span className="font-mono-nums font-medium">{numberFormatter.format(entry.quantity)}</span>
        </span>
      ))}
      {rows.length > 0 && (
        <span className={cn('font-semibold', isShort ? 'text-destructive' : 'text-[var(--success)]')}>
          En almacén: {numberFormatter.format(total)}
        </span>
      )}
    </p>
  );
}
