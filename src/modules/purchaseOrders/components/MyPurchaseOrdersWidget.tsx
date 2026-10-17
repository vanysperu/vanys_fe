import { ShoppingCart } from 'lucide-react';

import { usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { PurchaseOrderItemsChecklist } from '@/modules/purchaseOrders/components/PurchaseOrderItemsChecklist';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

// "Inicio" -> lo que a MÍ me toca comprar, sin importar el rol — cualquier
// usuario puede ser el asignado de una orden de compra (pedido explícito:
// "esa persona también le sale ahí como decir órdenes de compra que son a
// su cargo"). El asignado siempre puede marcar sus propios items (el
// backend ya valida esto sin necesitar el permiso de admin).
export function MyPurchaseOrdersWidget() {
  const { data, isLoading } = usePurchaseOrders({ assignedToMe: true, status: 'pending' });

  const orders = data?.data ?? [];

  if (!isLoading && orders.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <ShoppingCart className="size-4 text-primary" />
        <span className="text-sm font-semibold">Órdenes de compra a mi cargo</span>
      </div>

      {isLoading && <Skeleton className="h-16 w-full" />}

      <div className="space-y-1.5">
        {orders.map((order) => (
          <div key={order.id} className="rounded-lg border px-3 py-2">
            <p className="text-sm font-medium">
              COT-{String(order.quotation_id).padStart(4, '0')}
              {order.quotation?.client?.name ? ` · ${order.quotation.client.name}` : ''}
            </p>
            <PurchaseOrderItemsChecklist items={order.items} canEdit quotationId={order.quotation_id} />
          </div>
        ))}
      </div>
    </div>
  );
}
