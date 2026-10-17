import { ShoppingCart } from 'lucide-react';
import { useState } from 'react';

import { usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { PurchaseOrderItemsChecklist } from '@/modules/purchaseOrders/components/PurchaseOrderItemsChecklist';
import {
  PURCHASE_ORDER_STATUS_LABEL,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const ALL_STATUS_VALUE = 'all';

// Vista de empresa de todas las órdenes de compra (a diferencia del widget
// "a mi cargo" del Inicio, acá un admin ve TODAS las de su empresa) —
// pedido explícito: "en el menú dice órdenes de compra... eso debe llevar
// a su propia pantalla". El estado de la orden es de solo lectura acá (se
// calcula de sus items, nunca se pone a mano) — lo que sí se edita es el
// estado de cada producto, con el mismo checklist que en la cotización.
export function PurchaseOrdersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>(undefined);
  const [orderBy, setOrderBy] = useState<string | undefined>(undefined);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc' | undefined>(undefined);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const canEditItems = usePermissionButton('purchase_order.item.updateStatus.button');

  const handleSortChange = (key: string, dir: 'asc' | 'desc' | undefined) => {
    setOrderBy(dir ? key : undefined);
    setOrderDir(dir);
    setPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string) => {
    setColumnFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const { data, isLoading } = usePurchaseOrders({
    page,
    limit: pageSize,
    status,
    orderBy,
    orderDir,
    clientName: columnFilters.clientName || undefined,
    assigneeName: columnFilters.assigneeName || undefined,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Órdenes de compra"
        description="Qué producto de cada cotización le toca comprar a quién"
        action={
          <Select
            value={status ?? ALL_STATUS_VALUE}
            onValueChange={(value) => setStatus(value === ALL_STATUS_VALUE ? undefined : (value as PurchaseOrderStatus))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS_VALUE}>Todos los estados</SelectItem>
              {Object.entries(PURCHASE_ORDER_STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <DataTable<PurchaseOrder>
        columns={[
          {
            header: 'Cotización',
            sortable: true,
            sortKey: 'quotation_id',
            cell: (order) => (
              <span className="font-mono-nums font-medium text-primary">
                COT-{String(order.quotation_id).padStart(4, '0')}
              </span>
            ),
          },
          {
            header: 'Cliente',
            filterable: true,
            filterKey: 'clientName',
            cell: (order) => order.quotation?.client?.name ?? '—',
          },
          {
            header: 'Productos',
            className: 'min-w-56',
            // Los íconos de carrito/prohibido son acciones POR PRODUCTO
            // (una orden puede tener varios productos con estados distintos
            // a la vez), no una acción única por fila de orden — por eso se
            // quedan dentro del checklist en vez de una columna de acciones
            // dedicada, que no tendría sentido para múltiples productos.
            cell: (order) => (
              <PurchaseOrderItemsChecklist items={order.items} canEdit={canEditItems} quotationId={order.quotation_id} />
            ),
          },
          {
            header: 'Asignado a',
            filterable: true,
            filterKey: 'assigneeName',
            cell: (order) => (order.assignee ? `${order.assignee.name} ${order.assignee.paternal_lastname}` : '—'),
          },
          {
            header: 'Estado',
            sortable: true,
            sortKey: 'status',
            cell: (order) => (
              <Badge variant={order.status === 'purchased' ? 'success' : 'default'}>
                {PURCHASE_ORDER_STATUS_LABEL[order.status]}
              </Badge>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(order) => order.id}
        isLoading={isLoading}
        emptyIcon={ShoppingCart}
        emptyTitle="No se encontraron órdenes de compra"
        sortBy={orderBy}
        sortDir={orderDir}
        onSortChange={handleSortChange}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
      />

      {data && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
