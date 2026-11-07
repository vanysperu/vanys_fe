import { TriangleAlert } from 'lucide-react';

interface MinOrderNoticeProps {
  quantity: number | undefined;
  minOrderQuantity: number | null | undefined;
  // false = solo aparece cuando la cantidad está por debajo (vistas de solo lectura).
  showWhenMet?: boolean;
}

// Pedido mínimo de un item. Es solo informativo (decisión del usuario): nunca
// impide guardar. Marca también los pedidos de la web que llegaron por debajo.
export function MinOrderNotice({ quantity, minOrderQuantity, showWhenMet = true }: MinOrderNoticeProps) {
  if (minOrderQuantity == null) return null;

  const isBelow = quantity != null && !Number.isNaN(quantity) && quantity < minOrderQuantity;
  if (isBelow) {
    return (
      <p className="flex items-center gap-1 text-[11px] text-warning" data-testid="below-min-order">
        <TriangleAlert className="size-3 shrink-0" aria-hidden />
        Debajo del mínimo ({minOrderQuantity})
      </p>
    );
  }
  if (!showWhenMet) return null;
  return <p className="text-[11px] text-muted-foreground">Mínimo: {minOrderQuantity}</p>;
}
