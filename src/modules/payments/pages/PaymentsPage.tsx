import { zodResolver } from '@hookform/resolvers/zod';
import { CreditCard, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { usePayments, useTogglePaymentStatus, useUpdatePayment } from '@/modules/payments/hooks/usePayments';
import {
  CASH_PAYMENT_METHOD,
  updatePaymentSchema,
  type UpdatePaymentFormValues,
} from '@/modules/payments/schemas/payment.schema';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import type { PaymentStatusFilter } from '@/modules/payments/types/payment.types';
import type { PaymentListItem } from '@/modules/payments/types/payment.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateField } from '@/presentation/components/shared/DateField';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Vista única de TODOS los pagos de la empresa (antes solo se veían
// embebidos en el detalle de cada cotización) — pedido explícito del
// usuario: "crea el modulo de pago bien completo". Editar/anular un pago
// recalcula total_paid de su cotización en el backend (payment.service.ts).
export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingPayment, setEditingPayment] = useState<PaymentListItem | null>(null);
  // Filtros (pedido explícito del usuario: rangos de fecha, estados, personas).
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [methodFilter, setMethodFilter] = useState<string | undefined>(undefined);
  const [accountFilter, setAccountFilter] = useState<string | undefined>(undefined);
  const [clientName, setClientName] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const { data: accountsForFilter } = usePaymentAccounts();

  const canUpdate = usePermissionButton('payment.update.button');
  const canDisable = usePermissionButton('payment.disable.button');

  // A diferencia de Caja (que oculta un movimiento deshabilitado para
  // siempre), acá SÍ se listan los anulados con su badge — la columna de
  // estado y el botón de alternar (ToggleStatusButton) no tendrían sentido
  // si el pago desapareciera de la tabla al anularlo.
  const { data, isLoading } = usePayments({
    page,
    limit: pageSize,
    // Sin filtro elegido se listan vigentes y anulados (con su badge).
    status: (statusFilter as PaymentStatusFilter | undefined) ?? 'all',
    method: methodFilter,
    paymentAccountId: accountFilter === 'cash' ? 'cash' : accountFilter ? Number(accountFilter) : undefined,
    clientName: clientName.trim() || undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const hasActiveFilters = Boolean(
    statusFilter || methodFilter || accountFilter || clientName || dateRange.dateFrom || dateRange.dateTo,
  );
  const clearFilters = () => {
    setStatusFilter(undefined);
    setMethodFilter(undefined);
    setAccountFilter(undefined);
    setClientName('');
    setDateRange({});
    setPage(1);
  };
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
  const { mutate: toggleStatus, isPending: isToggling } = useTogglePaymentStatus();

  // El backend guarda el prefix_id (ej. "cash"), no el nombre — mismo
  // criterio de resolución que QuotationPaymentsSection.tsx (acepta también
  // el nombre viejo, para pagos del historial anterior a este catálogo).
  const { data: methodsResult } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });
  const paymentMethods = methodsResult?.data ?? [];
  const methodLabel = (value: string | null) =>
    paymentMethods.find((method) => method.prefix_id === value || method.name === value)?.name ?? value ?? '—';

  return (
    <div className="space-y-6">
      <PageHeader title="Pagos recibidos" description="Pagos de los clientes registrados en las cotizaciones de la empresa" />

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="h-9 w-56 pl-9"
            value={clientName}
            onChange={(event) => withPageReset(setClientName)(event.target.value)}
          />
        </div>
        <FilterSelect
          aria-label="Estado"
          allLabel="Vigentes y anulados"
          value={statusFilter}
          onChange={withPageReset(setStatusFilter)}
          options={[
            { value: 'active', label: 'Solo vigentes' },
            { value: 'disabled', label: 'Solo anulados' },
          ]}
        />
        <FilterSelect
          aria-label="Método"
          allLabel="Todos los métodos"
          value={methodFilter}
          onChange={withPageReset(setMethodFilter)}
          options={paymentMethods.map((method) => ({ value: method.prefix_id, label: method.name }))}
        />
        <FilterSelect
          aria-label="Cuenta"
          allLabel="Todas las cuentas"
          value={accountFilter}
          onChange={withPageReset(setAccountFilter)}
          options={[
            { value: 'cash', label: 'Efectivo' },
            ...(accountsForFilter?.data ?? []).map((row) => ({ value: String(row.id), label: row.name })),
          ]}
        />
        <DateRangeFilter placeholder="Fecha de pago" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<PaymentListItem>
        columns={[
          { header: 'Fecha', cell: (row) => new Date(`${row.paid_at}T00:00:00`).toLocaleDateString('es-PE') },
          {
            header: 'Cotización',
            cell: (row) => (
              <span>
                COT-{String(row.quotation_id).padStart(4, '0')}
                <span className="block text-[10px] text-muted-foreground">{row.client_name}</span>
              </span>
            ),
          },
          { header: 'Método', cell: (row) => methodLabel(row.method) },
          // A qué cuenta entró el dinero (pedido explícito del usuario).
          { header: 'Cuenta', cell: (row) => row.payment_account_name ?? 'Efectivo' },
          { header: 'N° operación', cell: (row) => row.operation_number ?? '—' },
          {
            header: 'Monto',
            align: 'right',
            cell: (row) => <span className="font-semibold">{money(row.amount)}</span>,
          },
          {
            header: 'Estado',
            cell: (row) => <Badge variant={row.is_deleted ? 'destructive' : 'success'}>{row.is_deleted ? 'Anulado' : 'Activo'}</Badge>,
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <div className="flex justify-end gap-1">
                {canUpdate && !row.is_deleted && (
                  <button
                    type="button"
                    title="Editar pago"
                    onClick={() => setEditingPayment(row)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={!row.is_deleted}
                    disabled={isToggling}
                    entityLabel="pago"
                    onToggle={() =>
                      toggleStatus(row.id, {
                        onSuccess: () => toast.success(row.is_deleted ? 'Pago restaurado' : 'Pago anulado'),
                        onError: () => toast.error('No se pudo actualizar el pago'),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={CreditCard}
        emptyTitle="No se encontraron pagos"
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

      {editingPayment && <EditPaymentDialog payment={editingPayment} onClose={() => setEditingPayment(null)} />}
    </div>
  );
}

function EditPaymentDialog({ payment, onClose }: { payment: PaymentListItem; onClose: () => void }) {
  const { data: methods } = useVariableGenerals({ category: 'payment_method', ignorePagination: true });
  const { mutate: update, isPending, error } = useUpdatePayment();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<UpdatePaymentFormValues>({
    resolver: zodResolver(updatePaymentSchema),
    defaultValues: {
      amount: payment.amount,
      method: payment.method ?? '',
      paid_at: payment.paid_at,
      notes: payment.notes ?? undefined,
      operation_number: payment.operation_number ?? undefined,
      payment_account_id: payment.payment_account_id,
    },
  });

  const methodOptions = (methods?.data ?? []).map((item) => ({ value: item.prefix_id, label: item.name }));
  const { data: accountsResult } = usePaymentAccounts();
  const hasAccounts = (accountsResult?.data ?? []).some((account) => !account.is_deleted);
  const isCash = watch('method') === CASH_PAYMENT_METHOD;

  const onSubmit = (values: UpdatePaymentFormValues) => {
    // Misma regla que al registrar: si no es efectivo y la empresa tiene
    // cuentas, hay que decir a cuál entró.
    if (!isCash && hasAccounts && values.payment_account_id == null) {
      setError('payment_account_id', { message: 'Indica a qué cuenta (banco, Yape o Plin) entró el pago' });
      return;
    }
    update(
      { id: payment.id, dto: { ...values, payment_account_id: isCash ? null : (values.payment_account_id ?? null) } },
      {
        onSuccess: () => {
          toast.success('Pago actualizado correctamente');
          onClose();
        },
      },
    );
  };

  const apiError = error as ApiClientError | null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar pago</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Monto (S/)</Label>
              <Input id="payment-amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-date">Fecha de pago</Label>
              <DateField id="payment-date" value={watch('paid_at')} onChange={(value) => setValue('paid_at', value, { shouldValidate: true })} />
              {errors.paid_at && <p className="text-sm text-destructive">{errors.paid_at.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <SearchableSelect
              placeholder="Selecciona un método"
              value={watch('method')}
              onChange={(value) => setValue('method', value, { shouldValidate: true })}
              options={methodOptions}
            />
            {errors.method && <p className="text-sm text-destructive">{errors.method.message}</p>}
          </div>

          {!isCash && (
            <div className="space-y-2">
              <Label htmlFor="payment-account">Cuenta de destino</Label>
              <PaymentAccountSelect
                id="payment-account"
                allowCash={false}
                value={watch('payment_account_id')}
                onChange={(value) => setValue('payment_account_id', value, { shouldValidate: true })}
              />
              {errors.payment_account_id && <p className="text-sm text-destructive">{errors.payment_account_id.message}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-operation-number">N° de operación</Label>
            <Input id="payment-operation-number" {...register('operation_number')} />
            {errors.operation_number && <p className="text-sm text-destructive">{errors.operation_number.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Notas</Label>
            <Textarea id="payment-notes" rows={2} {...register('notes')} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
