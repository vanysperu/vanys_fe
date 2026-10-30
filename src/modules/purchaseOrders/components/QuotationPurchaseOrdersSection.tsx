import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Check, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

import type { QuotationItem } from '@/modules/quotations/types/quotation.types';
import { useCreatePurchaseOrder, usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { PurchaseOrderItemsChecklist } from '@/modules/purchaseOrders/components/PurchaseOrderItemsChecklist';
import {
  createPurchaseOrderSchema,
  type CreatePurchaseOrderFormValues,
} from '@/modules/purchaseOrders/schemas/purchaseOrder.schema';
import { PURCHASE_ORDER_STATUS_LABEL } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { Label } from '@/presentation/components/shared/ui/label';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

interface QuotationPurchaseOrdersSectionProps {
  quotationId: number;
  companyId: number;
  items: QuotationItem[];
  canCreate: boolean;
}

// "Orden de compra": se le asigna a una persona (usuario del sistema de la
// misma empresa) la tarea de comprar uno o más productos de esta
// cotización — pedido explícito del usuario ("le seleccionas el producto...
// y le asignas a esa persona"). Esa persona ve sus órdenes pendientes en su
// propio Inicio (ver DashboardMyPurchaseOrders).
export function QuotationPurchaseOrdersSection({
  quotationId,
  companyId,
  items,
  canCreate,
}: QuotationPurchaseOrdersSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const { data: ordersResult } = usePurchaseOrders({ quotationId });
  const { data: usersResult } = useUsers({ limit: 100 });
  const { mutate: create, isPending } = useCreatePurchaseOrder();
  const canEditItems = usePermissionButton('purchase_order.item.updateStatus.button');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreatePurchaseOrderFormValues>({
    resolver: zodResolver(createPurchaseOrderSchema),
    defaultValues: { itemIds: [] },
  });

  const selectedItemIds = watch('itemIds');
  const orders = ordersResult?.data ?? [];
  const users = usersResult?.data ?? [];

  const toggleItem = (itemId: number, checked: boolean) => {
    setValue('itemIds', checked ? [...selectedItemIds, itemId] : selectedItemIds.filter((id) => id !== itemId));
  };

  const onSubmit = (values: CreatePurchaseOrderFormValues) => {
    create(
      {
        company_id: companyId,
        quotation_id: quotationId,
        assigned_to: values.assigned_to,
        notes: values.notes,
        items: values.itemIds.map((quotation_item_id) => ({
          quotation_item_id,
          quantity: items.find((item) => item.id === quotation_item_id)?.quantity ?? 1,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Orden de compra creada');
          reset({ itemIds: [] });
          setFormOpen(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border">
        {orders.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sin órdenes de compra.</p>}
        {orders.map((order) => (
          <div key={order.id} className="space-y-1 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {order.assignee ? `${order.assignee.name} ${order.assignee.paternal_lastname}` : '—'}
              </span>
              <Badge variant={order.status === 'purchased' ? 'success' : 'default'}>
                {PURCHASE_ORDER_STATUS_LABEL[order.status]}
              </Badge>
            </div>
            <PurchaseOrderItemsChecklist items={order.items} canEdit={canEditItems} quotationId={quotationId} />
          </div>
        ))}
      </div>

      {canCreate && (
        <div>
          {!formOpen ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Crear orden de compra
            </Button>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label>Productos a comprar</Label>
                <div className="space-y-1.5 rounded-md border p-2">
                  {items.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedItemIds.includes(item.id)}
                        onCheckedChange={(checked) => toggleItem(item.id, Boolean(checked))}
                      />
                      {item.product?.name} <span className="text-xs text-muted-foreground">(cant. {item.quantity})</span>
                    </label>
                  ))}
                </div>
                {errors.itemIds && <p className="text-xs text-destructive">{errors.itemIds.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Asignado a</Label>
                <Controller
                  control={control}
                  name="assigned_to"
                  render={({ field }) => (
                    <SearchableSelect
                      placeholder="Selecciona una persona"
                      value={field.value ? String(field.value) : undefined}
                      onChange={(value) => field.onChange(Number(value))}
                      // + email: dos personas de la misma empresa pueden
                      // llamarse igual — sin un dato que las distinga, el
                      // selector se veía con "contenido duplicado" (bug
                      // reportado por QA) aunque cada fila fuera una
                      // persona real distinta.
                      options={users.map((user) => ({
                        value: String(user.id),
                        label: `${user.name} ${user.paternal_lastname} · ${user.email}`,
                      }))}
                    />
                  )}
                />
                {errors.assigned_to && <p className="text-xs text-destructive">{errors.assigned_to.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="po-notes">Notas (opcional)</Label>
                <Textarea id="po-notes" rows={2} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
                <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => setFormOpen(false)}>
                  <X className="size-4" />
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  <Check className="size-4" />
                  Crear orden
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
