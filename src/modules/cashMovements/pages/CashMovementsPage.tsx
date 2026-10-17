import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { useQuotations } from '@/modules/quotations/hooks/useQuotations';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import {
  useCashMovements,
  useCreateCashMovement,
  useToggleCashMovementStatus,
} from '@/modules/cashMovements/hooks/useCashMovements';
import { createCashMovementSchema, type CreateCashMovementFormValues } from '@/modules/cashMovements/schemas/cashMovement.schema';
import {
  CASH_MOVEMENT_DIRECTION_LABEL,
  type CashMovementDirection,
  type CashMovementListItem,
} from '@/modules/cashMovements/types/cashMovement.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateField } from '@/presentation/components/shared/DateField';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const ALL_DIRECTION_VALUE = 'all';

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SOURCE_LABEL: Record<CashMovementListItem['source'], string> = {
  manual: 'Movimiento manual',
  quotation_payment: 'Pago de cotización',
  quotation_expense: 'Gasto de cotización',
};

// Libro de caja: junta en un solo listado lo que ya se registra en
// cotizaciones (Pagos = ingreso, Gastos = egreso, y toda compra de una
// orden ya genera un gasto) MÁS los movimientos manuales propios de este
// módulo (ej. pagar el alquiler) — pedido explícito del usuario: "toda
// entra y salida de dinero debe estar ligada a un tipo... y también poder
// vincularse a alguna cotización o orden de compra". Solo los movimientos
// "manual" se pueden deshabilitar acá; los otros dos se gestionan desde su
// propia pantalla de origen (Pagos/Gastos de la cotización).
export function CashMovementsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [direction, setDirection] = useState<CashMovementDirection | undefined>(undefined);

  const canCreate = usePermissionButton('cash_movement.create.button');
  const canDisable = usePermissionButton('cash_movement.disable.button');

  const { data, isLoading } = useCashMovements({ page, limit: pageSize, direction });
  const { mutate: toggleStatus, isPending: isToggling } = useToggleCashMovementStatus();

  const totals = (data?.data ?? []).reduce(
    (acc, item) => {
      if (item.direction === 'income') acc.income += item.amount;
      else acc.expense += item.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja"
        description="Ingresos y salidas de dinero — pagos, gastos y movimientos manuales"
        action={
          <div className="flex items-center gap-3">
            <Select
              value={direction ?? ALL_DIRECTION_VALUE}
              onValueChange={(value) => {
                setDirection(value === ALL_DIRECTION_VALUE ? undefined : (value as CashMovementDirection));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_DIRECTION_VALUE}>Todos</SelectItem>
                <SelectItem value="income">Solo ingresos</SelectItem>
                <SelectItem value="expense">Solo egresos</SelectItem>
              </SelectContent>
            </Select>
            {canCreate && <CreateCashMovementDialog />}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <ArrowUpCircle className="size-8 text-[var(--success)]" />
          <div>
            <p className="text-xs text-muted-foreground">Ingresos (esta página)</p>
            <p className="text-lg font-semibold">{money(totals.income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <ArrowDownCircle className="size-8 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Egresos (esta página)</p>
            <p className="text-lg font-semibold">{money(totals.expense)}</p>
          </div>
        </div>
      </div>

      <DataTable<CashMovementListItem>
        columns={[
          { header: 'Fecha', cell: (row) => new Date(`${row.occurred_at}T00:00:00`).toLocaleDateString('es-PE') },
          {
            header: 'Tipo',
            cell: (row) => (
              <Badge variant={row.direction === 'income' ? 'success' : 'destructive'}>
                {CASH_MOVEMENT_DIRECTION_LABEL[row.direction]}
              </Badge>
            ),
          },
          { header: 'Categoría', cell: (row) => row.category ?? '—' },
          {
            header: 'Descripción',
            className: 'min-w-56',
            cell: (row) => (
              <div>
                <span>{row.description ?? '—'}</span>
                <span className="block text-[10px] text-muted-foreground">
                  {SOURCE_LABEL[row.source]}
                  {row.quotation_id && ` · COT-${String(row.quotation_id).padStart(4, '0')}`}
                  {row.purchase_order_id && ` · OC-${String(row.purchase_order_id).padStart(4, '0')}`}
                </span>
              </div>
            ),
          },
          {
            header: 'Monto',
            align: 'right',
            cell: (row) => (
              <span className={row.direction === 'income' ? 'font-semibold text-[var(--success)]' : 'font-semibold text-destructive'}>
                {row.direction === 'income' ? '+' : '-'} {money(row.amount)}
              </span>
            ),
          },
          {
            header: '',
            align: 'right',
            cell: (row) =>
              row.source === 'manual' && canDisable ? (
                <div className="flex justify-end">
                  <ToggleStatusButton
                    active
                    disabled={isToggling}
                    entityLabel="movimiento"
                    onToggle={() =>
                      toggleStatus(row.source_id, {
                        onSuccess: () => toast.success('Movimiento deshabilitado'),
                        onError: () => toast.error('No se pudo actualizar el movimiento'),
                      })
                    }
                  />
                </div>
              ) : null,
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={Wallet}
        emptyTitle="No se encontraron movimientos"
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

function CreateCashMovementDialog() {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: categories } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });
  const { data: quotations } = useQuotations({ page: 1, limit: 100 });
  const { data: purchaseOrders } = usePurchaseOrders({ page: 1, limit: 100 });
  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: isSystem });
  const { mutate: create, isPending, error } = useCreateCashMovement();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateCashMovementFormValues>({ resolver: zodResolver(createCashMovementSchema) });

  const direction = watch('direction');
  const categoryOptions = (categories?.data ?? []).map((item) => ({ value: item.prefix_id, label: item.name }));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset({});
  };

  const onSubmit = (values: CreateCashMovementFormValues) => {
    create(values, {
      onSuccess: () => {
        toast.success('Movimiento registrado correctamente');
        reset({});
        handleOpenChange(false);
      },
    });
  };

  const apiError = error as ApiClientError | null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Nuevo movimiento
        </Button>
      </DialogTrigger>
      <DialogContent expandable className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento de caja</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={direction}
                onValueChange={(value) => setValue('direction', value as CashMovementDirection, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Egreso</SelectItem>
                </SelectContent>
              </Select>
              {errors.direction && <p className="text-sm text-destructive">{errors.direction.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <SearchableSelect
                placeholder="Selecciona una categoría"
                value={watch('category')}
                onChange={(value) => setValue('category', value, { shouldValidate: true })}
                options={categoryOptions}
              />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cash-movement-amount">Monto (S/)</Label>
              <Input id="cash-movement-amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-movement-date">Fecha</Label>
              <DateField
                id="cash-movement-date"
                value={watch('occurred_at')}
                onChange={(value) => setValue('occurred_at', value, { shouldValidate: true })}
              />
              {errors.occurred_at && <p className="text-sm text-destructive">{errors.occurred_at.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cash-movement-description">Descripción</Label>
            <Textarea id="cash-movement-description" rows={2} {...register('description')} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Vínculo opcional a una cotización u orden de compra (pedido
              explícito del usuario) — NUNCA reemplaza el registro de Pagos/
              Gastos propio de la cotización, solo da contexto a un
              movimiento manual relacionado a ese trabajo puntual. */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cotización (opcional)</Label>
              <SearchableSelect
                placeholder="Ninguna"
                value={watch('quotation_id') ? String(watch('quotation_id')) : undefined}
                onChange={(value) => setValue('quotation_id', Number(value))}
                options={(quotations?.data ?? []).map((quotation) => ({
                  value: String(quotation.id),
                  label: `COT-${String(quotation.id).padStart(4, '0')} — ${quotation.client?.name ?? 'Sin cliente'}`,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Orden de compra (opcional)</Label>
              <SearchableSelect
                placeholder="Ninguna"
                value={watch('purchase_order_id') ? String(watch('purchase_order_id')) : undefined}
                onChange={(value) => setValue('purchase_order_id', Number(value))}
                options={(purchaseOrders?.data ?? []).map((order) => ({
                  value: String(order.id),
                  label: `OC-${String(order.id).padStart(4, '0')} — ${order.quotation?.client?.name ?? 'Sin cliente'}`,
                }))}
              />
            </div>
          </div>

          {isSystem && businessUnits && businessUnits.data.length > 0 && (
            <div className="space-y-2">
              <Label>Tienda (opcional)</Label>
              <Select
                value={watch('business_unit_id') ? String(watch('business_unit_id')) : undefined}
                onValueChange={(value) => setValue('business_unit_id', Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin tienda específica" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.data.map((businessUnit) => (
                    <SelectItem key={businessUnit.id} value={String(businessUnit.id)}>
                      {businessUnit.business_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Check className="size-4" />
              {isPending ? 'Guardando...' : 'Registrar movimiento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
