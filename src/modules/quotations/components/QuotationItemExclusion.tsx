import { Ban, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDateTime } from '@/lib/dateUtils';
import { useSetQuotationItemExcluded } from '@/modules/quotations/hooks/useQuotations';
import type { QuotationItem } from '@/modules/quotations/types/quotation.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';

interface ExclusionButtonProps {
  quotationId: number;
  item: QuotationItem;
}

// "No aceptado" en una fila de la cotización (pedido del usuario, 14-nov):
// el cliente no aceptó ese producto. Pide confirmación porque cambia el total.
export function ExcludeItemButton({ quotationId, item }: ExclusionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const { mutate: setExcluded, isPending } = useSetQuotationItemExcluded(quotationId);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7"
        title="Marcar como no aceptado"
        aria-label={`Marcar ${item.product?.name ?? 'producto'} como no aceptado`}
        disabled={isPending}
        onClick={() => setConfirming(true)}
      >
        <Ban className="size-3.5 text-destructive" />
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="¿El cliente no aceptó este producto?"
        description={`"${item.product?.name ?? 'Producto'}" deja de salir en el PDF y en el enlace del cliente, y no suma al total. Ustedes lo siguen viendo y se puede reactivar.`}
        confirmLabel="Marcar como no aceptado"
        variant="destructive"
        onConfirm={() => {
          setConfirming(false);
          setExcluded(
            { itemId: item.id, excluded: true },
            {
              onSuccess: (result) => toast.success(`Producto marcado como no aceptado. Nuevo total: S/ ${result.total.toFixed(2)}`),
              onError: (error) => toast.error((error as ApiClientError).message),
            },
          );
        }}
      />
    </>
  );
}

interface ExcludedItemsListProps {
  quotationId: number;
  items: QuotationItem[];
  canReactivate: boolean;
}

// Productos que el cliente no aceptó: siguen a la vista del equipo (historial
// de lo que se pidió), tachados y sin sumar, con "Reactivar" si el cliente cambia de idea.
export function ExcludedItemsList({ quotationId, items, canReactivate }: ExcludedItemsListProps) {
  const { mutate: setExcluded, isPending } = useSetQuotationItemExcluded(quotationId);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2" data-testid="excluded-items">
      <p className="text-sm font-medium">No aceptados por el cliente</p>
      <ul className="divide-y rounded-lg border border-dashed text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 text-muted-foreground line-through">
              {item.product?.name} × {item.quantity} · S/ {Number(item.subtotal).toFixed(2)}
            </span>
            {item.excluded_at && <span className="text-xs text-muted-foreground">desde {formatDateTime(item.excluded_at)}</span>}
            {canReactivate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  setExcluded(
                    { itemId: item.id, excluded: false },
                    {
                      onSuccess: (result) => toast.success(`Producto reactivado. Nuevo total: S/ ${result.total.toFixed(2)}`),
                      onError: (error) => toast.error((error as ApiClientError).message),
                    },
                  )
                }
              >
                <Undo2 className="size-3.5" />
                Reactivar
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">No salen en el PDF ni en el enlace del cliente y no suman al total.</p>
    </div>
  );
}
