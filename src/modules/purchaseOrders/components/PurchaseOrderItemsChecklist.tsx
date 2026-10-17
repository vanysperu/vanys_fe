import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, RotateCcw, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { NOTES_MAX_LENGTH } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { useCreatePurchaseOrderItemPurchase, useUpdatePurchaseOrderItemStatus } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import {
  FUNDING_SOURCE_LABEL,
  type FundingSource,
  type PurchaseOrderItem,
  type PurchaseOrderItemStatus,
} from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { CharCounter } from '@/presentation/components/shared/CharCounter';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import type { ApiClientError } from '@/config/api.types';

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const registerPurchaseSchema = z.object({
  quantity: z.number({ error: 'La cantidad es obligatoria' }).int().positive('Debe ser mayor a 0'),
  amount: z.number({ error: 'El monto es obligatorio' }).positive('Debe ser mayor a 0'),
  notes: z.string().max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres`).optional(),
  funding_source: z.enum(['company', 'employee'], { error: 'Selecciona con qué plata se pagó' }),
});
type RegisterPurchaseFormValues = z.infer<typeof registerPurchaseSchema>;

interface PurchaseOrderItemsChecklistProps {
  items: PurchaseOrderItem[];
  canEdit: boolean;
  // Para invalidar el detalle de la cotización (pestaña Gastos) al
  // registrar una compra — toda compra genera un gasto real.
  quotationId?: number;
}

const STATUS_STYLE: Record<PurchaseOrderItemStatus, string> = {
  pending: 'text-foreground',
  purchased: 'text-[var(--success)]',
  not_needed: 'text-muted-foreground/60 line-through italic',
};

// Checklist por producto de una orden de compra. Un producto puede
// conseguirse en varias compras distintas (500 lapiceros: 100 acá, 200
// allá, 200 más allá) — "Registrar compra" pide cantidad + monto cada vez
// (toda compra ES un gasto, se refleja solo en la pestaña Gastos) y el
// producto pasa a "comprado" recién cuando la suma alcanza lo pedido.
export function PurchaseOrderItemsChecklist({ items, canEdit, quotationId }: PurchaseOrderItemsChecklistProps) {
  const [openFormItemId, setOpenFormItemId] = useState<number | null>(null);
  const { mutate: updateStatus, isPending: isUpdatingStatus } = useUpdatePurchaseOrderItemStatus();
  const { mutate: registerPurchase, isPending: isRegistering } = useCreatePurchaseOrderItemPurchase(quotationId);

  const setStatus = (itemId: number, status: PurchaseOrderItemStatus) => {
    updateStatus({ itemId, status }, { onError: (error) => toast.error((error as ApiClientError).message) });
  };

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const purchasedQty = item.purchases.reduce((sum, purchase) => sum + purchase.quantity, 0);
        const spentAmount = item.purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0);
        const hasEmployeeFunding = item.purchases.some((purchase) => purchase.funding_source === 'employee');
        const isFormOpen = openFormItemId === item.id;

        return (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                {/* El nombre trunca solo a sí mismo (puede ser largo) — la
                    cantidad va aparte y con shrink-0, así nunca se la come
                    la elipsis del nombre (antes iban en el mismo <span> con
                    truncate y "(comprado/total)" quedaba escondido). */}
                <div className="flex items-baseline gap-1">
                  <span className={cn('truncate', STATUS_STYLE[item.status])}>
                    {item.quotationItem?.product?.name ?? '—'}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    ({purchasedQty}/{item.quantity})
                  </span>
                </div>
                {purchasedQty > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Gastado: {money(spentAmount)}
                    {hasEmployeeFunding && <span className="ml-1 text-[var(--warning,#b45309)]">· incluye plata propia</span>}
                  </p>
                )}
              </div>

              {canEdit && (
                <div className="flex shrink-0 items-center gap-0.5">
                  {item.status === 'pending' && (
                    <button
                      type="button"
                      title="Registrar compra"
                      onClick={() => setOpenFormItemId(isFormOpen ? null : item.id)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-[var(--success)]/10 hover:text-[var(--success)]"
                    >
                      <ShoppingCart className="size-3.5" />
                    </button>
                  )}
                  {item.status !== 'not_needed' && item.status !== 'purchased' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      title="Ya no es necesario"
                      onClick={() => setStatus(item.id, 'not_needed')}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Ban className="size-3.5" />
                    </button>
                  )}
                  {item.status === 'not_needed' && (
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      title="Volver a pendiente"
                      onClick={() => setStatus(item.id, 'pending')}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isFormOpen && (
              <RegisterPurchaseForm
                remaining={item.quantity - purchasedQty}
                isPending={isRegistering}
                onCancel={() => setOpenFormItemId(null)}
                onSubmit={(values) =>
                  registerPurchase(
                    { itemId: item.id, dto: values },
                    {
                      onSuccess: () => {
                        toast.success('Compra registrada');
                        setOpenFormItemId(null);
                      },
                      onError: (error) => toast.error((error as ApiClientError).message),
                    },
                  )
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RegisterPurchaseForm({
  remaining,
  isPending,
  onSubmit,
  onCancel,
}: {
  remaining: number;
  isPending: boolean;
  onSubmit: (values: RegisterPurchaseFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterPurchaseFormValues>({
    resolver: zodResolver(registerPurchaseSchema),
    defaultValues: { quantity: remaining > 0 ? remaining : 1, funding_source: 'company' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 rounded-md border bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">
        Faltan {remaining} — si lo compraste en varios lugares, registra cada compra por separado.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="purchase-quantity" className="text-xs">
            Cantidad comprada
          </Label>
          <Input id="purchase-quantity" type="number" {...register('quantity', { valueAsNumber: true })} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="purchase-amount" className="text-xs">
            Monto pagado (S/)
          </Label>
          <Input id="purchase-amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="purchase-notes" className="text-xs">
          Notas (opcional, ej. tienda donde se compró)
        </Label>
        <Textarea id="purchase-notes" rows={2} maxLength={NOTES_MAX_LENGTH} {...register('notes')} />
        <CharCounter value={watch('notes')} max={NOTES_MAX_LENGTH} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">¿Con qué plata se pagó?</Label>
        <Select
          value={watch('funding_source')}
          onValueChange={(value) => setValue('funding_source', value as FundingSource, { shouldValidate: true })}
        >
          <SelectTrigger id="purchase-funding-source">
            <SelectValue placeholder="Selecciona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="company">{FUNDING_SOURCE_LABEL.company}</SelectItem>
            <SelectItem value="employee">{FUNDING_SOURCE_LABEL.employee}</SelectItem>
          </SelectContent>
        </Select>
        {watch('funding_source') === 'employee' && (
          <p className="text-xs text-muted-foreground">
            Se registrará como una deuda de la empresa hacia ti (ver "Deudas a personal").
          </p>
        )}
        {errors.funding_source && <p className="text-xs text-destructive">{errors.funding_source.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          Guardar compra
        </Button>
      </div>
    </form>
  );
}
