import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Check, Plus, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { CompanyStoreFields } from '@/modules/platform/components/CompanyStoreFields';
import { usePurchaseOrders } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import { useQuotations } from '@/modules/quotations/hooks/useQuotations';
import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { PaymentAccountSelect, usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
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
  type CashMovementSource,
} from '@/modules/cashMovements/types/cashMovement.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateField } from '@/presentation/components/shared/DateField';
import { disableFuture } from '@/presentation/components/shared/ui/calendar';
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
import { DECIMAL_INPUT_STEP } from '@/lib/inputRestrictions';

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
  const [source, setSource] = useState<CashMovementSource | undefined>(undefined);
  const [account, setAccount] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const { data: accountsResult } = usePaymentAccounts();
  const { data: categoriesResult } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });

  const canCreate = usePermissionButton('cash_movement.create.button');
  const canDisable = usePermissionButton('cash_movement.disable.button');

  const { data, isLoading } = useCashMovements({
    page,
    limit: pageSize,
    direction,
    source,
    category,
    paymentAccountId: account === 'cash' ? 'cash' : account ? Number(account) : undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });

  const hasActiveFilters = Boolean(direction || source || account || category || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setDirection(undefined);
    setSource(undefined);
    setAccount(undefined);
    setCategory(undefined);
    setDateRange({});
    setPage(1);
  };
  // Cambiar cualquier filtro vuelve a la primera página.
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };
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
          <div className="flex items-center gap-3">{canCreate && <CreateCashMovementDialog />}</div>
        }
      />

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <FilterSelect
          aria-label="Tipo"
          allLabel="Ingresos y egresos"
          value={direction}
          onChange={withPageReset((value) => setDirection(value as CashMovementDirection | undefined))}
          options={[
            { value: 'income', label: 'Solo ingresos' },
            { value: 'expense', label: 'Solo egresos' },
          ]}
        />
        <FilterSelect
          aria-label="Origen"
          allLabel="Todos los orígenes"
          value={source}
          onChange={withPageReset((value) => setSource(value as CashMovementSource | undefined))}
          options={(Object.keys(SOURCE_LABEL) as CashMovementSource[]).map((value) => ({ value, label: SOURCE_LABEL[value] }))}
        />
        <FilterSelect
          aria-label="Cuenta"
          allLabel="Todas las cuentas"
          value={account}
          onChange={withPageReset(setAccount)}
          options={[
            { value: 'cash', label: 'Efectivo' },
            ...(accountsResult?.data ?? []).map((row) => ({ value: String(row.id), label: row.name })),
          ]}
        />
        <FilterSelect
          aria-label="Categoría"
          allLabel="Todas las categorías"
          value={category}
          onChange={withPageReset(setCategory)}
          options={(categoriesResult?.data ?? []).map((row) => ({ value: row.prefix_id, label: row.name }))}
        />
        <DateRangeFilter placeholder="Fecha" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                {/* Compra pagada con plata de un trabajador: quién la pagó y
                    si ya se le repuso (pedido explícito del usuario). */}
                {row.paid_by_employee_name && <EmployeeReimbursementNote row={row} />}
              </div>
            ),
          },
          {
            header: 'Cuenta',
            cell: (row) =>
              row.paid_by_employee_name && row.reimbursement_status === 'pending'
                ? '—'
                : (row.payment_account_name ?? 'Efectivo'),
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

// "Pagado por Juan Pérez · pendiente de reponer" o
// "Pagado por Juan Pérez · repuesto el 18/10/2026 desde BCP Soles".
function EmployeeReimbursementNote({ row }: { row: CashMovementListItem }) {
  if (row.reimbursement_status === 'paid') {
    const date = row.reimbursed_at ? new Date(`${row.reimbursed_at}T00:00:00`).toLocaleDateString('es-PE') : '';
    const from = row.payment_account_name ? ` desde ${row.payment_account_name}` : ' en efectivo';
    return (
      <span className="mt-0.5 block text-[11px] text-[var(--success)]">
        Pagado por {row.paid_by_employee_name} · repuesto el {date}
        {from}
      </span>
    );
  }
  return (
    <span className="mt-0.5 block text-[11px] text-[var(--warning,#b45309)]">
      Pagado por {row.paid_by_employee_name} · pendiente de reponer
    </span>
  );
}

function CreateCashMovementDialog() {
  const [open, setOpen] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: categories } = useVariableGenerals({ category: 'cash_movement_type', ignorePagination: true });
  const { mutate: create, isPending, error } = useCreateCashMovement();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<CreateCashMovementFormValues>({ resolver: zodResolver(createCashMovementSchema) });

  // Super Administrador: primero la empresa, y recién ahí sus cotizaciones,
  // órdenes de compra, tiendas y cuentas — nunca las de todas las empresas
  // mezcladas (pedido explícito del usuario). Un usuario de empresa siempre
  // ve las suyas (el backend lo fuerza).
  const selectedCompanyId = isSystem ? watch('company_id') : undefined;
  const listsEnabled = !isSystem || Boolean(selectedCompanyId);
  const { data: quotations } = useQuotations({ page: 1, limit: 100, companyId: selectedCompanyId }, { enabled: listsEnabled });
  const { data: purchaseOrders } = usePurchaseOrders(
    { page: 1, limit: 100, companyId: selectedCompanyId },
    { enabled: listsEnabled },
  );
  const belongsToSelectedCompany = (row: { company_id: number }) =>
    !isSystem || row.company_id === selectedCompanyId;

  const handleCompanyChange = (companyId: number) => {
    setValue('company_id', companyId, { shouldValidate: true });
    // Todo lo elegido antes era de otra empresa.
    setValue('quotation_id', undefined);
    setValue('purchase_order_id', undefined);
    setValue('payment_account_id', null);
  };

  const direction = watch('direction');
  const categoryOptions = (categories?.data ?? []).map((item) => ({ value: item.prefix_id, label: item.name }));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // reset() sin argumentos, NO reset({}): con un objeto vacío explícito,
    // los <input>/<textarea> nativos (amount, description) volvían a
    // mostrar lo último tipeado al reabrir el modal — los campos
    // Select/DateField (controlados vía watch()) sí se limpiaban bien, pero
    // los de registro nativo no (bug reportado por QA: "se mantienen los
    // datos al cerrar y reabrir").
    if (!next) reset();
  };

  const onSubmit = (values: CreateCashMovementFormValues) => {
    if (isSystem && !values.company_id) {
      setError('company_id', { message: 'Selecciona la empresa' });
      return;
    }
    create(values, {
      onSuccess: () => {
        toast.success('Movimiento registrado correctamente');
        reset();
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
          <CompanyStoreFields
            companyId={watch('company_id')}
            onCompanyChange={handleCompanyChange}
            businessUnitId={watch('business_unit_id')}
            onBusinessUnitChange={(value) => setValue('business_unit_id', value)}
            companyError={errors.company_id?.message}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash-movement-amount">Monto (S/)</Label>
              <Input id="cash-movement-amount" type="number" step={DECIMAL_INPUT_STEP} {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash-movement-date">Fecha</Label>
              <DateField
                id="cash-movement-date"
                value={watch('occurred_at')}
                onChange={(value) => setValue('occurred_at', value, { shouldValidate: true })}
                disabled={disableFuture}
              />
              {errors.occurred_at && <p className="text-sm text-destructive">{errors.occurred_at.message}</p>}
            </div>
          </div>

          {/* De qué cuenta salió / a qué cuenta entró (pedido explícito del
              usuario); por defecto efectivo. */}
          <div className="space-y-2">
            <Label htmlFor="cash-movement-account">{direction === 'income' ? 'Entró a' : direction === 'expense' ? 'Salió de' : 'Cuenta'}</Label>
            <PaymentAccountSelect
              id="cash-movement-account"
              value={watch('payment_account_id')}
              onChange={(value) => setValue('payment_account_id', value)}
              companyId={selectedCompanyId}
            />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cotización (opcional)</Label>
              <SearchableSelect
                placeholder="Ninguna"
                value={watch('quotation_id') ? String(watch('quotation_id')) : undefined}
                onChange={(value) => setValue('quotation_id', Number(value))}
                onClear={() => setValue('quotation_id', undefined)}
                options={(quotations?.data ?? []).filter(belongsToSelectedCompany).map((quotation) => ({
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
                onClear={() => setValue('purchase_order_id', undefined)}
                options={(purchaseOrders?.data ?? []).filter(belongsToSelectedCompany).map((order) => ({
                  value: String(order.id),
                  label: `OC-${String(order.id).padStart(4, '0')} — ${order.quotation?.client?.name ?? 'Sin cliente'}`,
                }))}
              />
            </div>
          </div>

          {apiError &&<p className="text-sm text-destructive">{apiError.message}</p>}

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
