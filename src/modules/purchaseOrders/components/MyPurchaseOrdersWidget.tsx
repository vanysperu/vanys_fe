import { ChevronDown, ShoppingCart } from 'lucide-react';

import { cn } from '@/lib/utils';
import { usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { PurchaseOrderItemsChecklist } from '@/modules/purchaseOrders/components/PurchaseOrderItemsChecklist';
import { isPurchaseOrderQuotationActive } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePersistentToggle } from '@/presentation/hooks/shared/usePersistentToggle';

// Cuántas órdenes trae el widget de una vez (el resto se avisa abajo).
const WIDGET_LIMIT = 50;
// Abierto/cerrado recordado en este navegador; arranca cerrado.
const OPEN_STORAGE_KEY = 'vanys.myPurchaseOrders.open';

// "Inicio" -> lo que a MÍ me toca comprar, sin importar el rol — cualquier
// usuario puede ser el asignado de una orden de compra (pedido explícito:
// "esa persona también le sale ahí como decir órdenes de compra que son a
// su cargo"). El asignado siempre puede marcar sus propios items (el
// backend ya valida esto sin necesitar el permiso de admin).
//
// Plegable con contador (pedido explícito: "se listan demasiado y se
// pierde"): arranca cerrado mostrando cuántas órdenes y productos faltan, y
// abierto queda en un contenedor de altura máxima con scroll.
export function MyPurchaseOrdersWidget({ refetchInterval }: { refetchInterval?: number }) {
  const { data, isLoading } = usePurchaseOrders(
    {
      assignedToMe: true,
      status: 'pending',
      limit: WIDGET_LIMIT,
    },
    { refetchInterval },
  );
  const [open, toggle] = usePersistentToggle(OPEN_STORAGE_KEY);

  const orders = data?.data ?? [];
  const totalOrders = data?.meta.total ?? orders.length;
  const pendingProducts = orders.reduce(
    (sum, order) => sum + order.items.filter((item) => item.status === 'pending').length,
    0,
  );
  const hiddenOrders = Math.max(totalOrders - orders.length, 0);

  if (!isLoading && orders.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm" data-testid="my-purchase-orders">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="my-purchase-orders-list"
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShoppingCart className="size-5" />
          {/* Contador siempre visible: invita a desplegar el bloque. */}
          {!isLoading && (
            <span
              className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-primary-foreground tabular-nums ring-2 ring-card"
              data-testid="my-purchase-orders-count"
            >
              {totalOrders}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Órdenes de compra a mi cargo</span>
          <span className="block text-xs text-muted-foreground">
            {isLoading
              ? 'Cargando…'
              : `${totalOrders} ${totalOrders === 1 ? 'orden pendiente' : 'órdenes pendientes'} · ${pendingProducts} ${pendingProducts === 1 ? 'producto' : 'productos'} por comprar`}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary">
          {open ? 'Ocultar' : 'Mostrar'}
          <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div id="my-purchase-orders-list" className="border-t bg-muted/20 p-3">
          {isLoading && <Skeleton className="h-16 w-full" />}

          {/* Altura máxima con scroll: con muchas órdenes el bloque ya no
              empuja el resto del Inicio fuera de la pantalla. */}
          <div
            className="scrollbar-thin -mr-1 max-h-[28rem] space-y-2 overflow-y-auto pr-1"
            data-testid="my-purchase-orders-scroll"
          >
            {orders.map((order) => {
              const orderPending = order.items.filter((item) => item.status === 'pending').length;
              return (
                <div key={order.id} className="rounded-lg border bg-card px-3 py-2.5 shadow-xs">
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-medium">
                      <span className="text-primary">COT-{String(order.quotation_id).padStart(4, '0')}</span>
                      {order.quotation?.client?.name ? ` · ${order.quotation.client.name}` : ''}
                    </p>
                    <Badge variant={orderPending > 0 ? 'warning' : 'success'}>
                      {orderPending > 0 ? `${orderPending} por comprar` : 'Todo comprado'}
                    </Badge>
                  </div>
                  <PurchaseOrderItemsChecklist
                    items={order.items}
                    canEdit={isPurchaseOrderQuotationActive(order)}
                    quotationId={order.quotation_id}
                    companyId={order.company_id}
                  />
                </div>
              );
            })}
          </div>

          {hiddenOrders > 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Se muestran {orders.length} de {totalOrders}. Las demás están en Órdenes de compra.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
