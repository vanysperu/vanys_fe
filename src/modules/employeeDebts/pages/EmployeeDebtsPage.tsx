import { Check, HandCoins, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useEmployeeDebts, usePayEmployeeDebt } from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import {
  EMPLOYEE_DEBT_STATUS_LABEL,
  type EmployeeDebtStatusFilter,
  type EmployeeDebtSummaryItem,
} from '@/modules/employeeDebts/types/employeeDebt.types';
import { PaymentAccountSelect } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_STATUS: EmployeeDebtStatusFilter = 'pending';

// "¿A quién se le debe y cuánto?" (pedido explícito del usuario) — se
// agrupa por trabajador: cuando alguien paga una compra de orden de compra
// con su propia plata (ver PurchaseOrderItemsChecklist), queda acá como
// deuda pendiente hasta que la empresa se la repone. Por defecto se ven solo
// las pendientes de pagar (pedido explícito del usuario).
export function EmployeeDebtsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [payingDebt, setPayingDebt] = useState<EmployeeDebtSummaryItem | null>(null);
  const [status, setStatus] = useState<EmployeeDebtStatusFilter>(DEFAULT_STATUS);
  const [employeeFilter, setEmployeeFilter] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});

  const canPay = usePermissionButton('employee_debt.pay.button');

  const { data, isLoading } = useEmployeeDebts({
    page,
    limit: pageSize,
    status,
    userId: employeeFilter ? Number(employeeFilter) : undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  // Trabajadores con alguna deuda (pendiente o pagada), para el filtro.
  const { data: allEmployees } = useEmployeeDebts({ page: 1, limit: 100, status: 'all' });

  const hasActiveFilters = status !== DEFAULT_STATUS || Boolean(employeeFilter || dateRange.dateFrom || dateRange.dateTo);
  const clearFilters = () => {
    setStatus(DEFAULT_STATUS);
    setEmployeeFilter(undefined);
    setDateRange({});
    setPage(1);
  };
  const withPageReset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const showPending = status !== 'paid';
  const showPaid = status !== 'pending';

  return (
    <div className="space-y-6">
      <PageHeader title="Deudas a personal" description="Dinero propio que un trabajador adelantó en una compra y la empresa debe reponerle" />

      <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
        <FilterSelect
          aria-label="Estado"
          hideAll
          value={status}
          onChange={(value) => withPageReset(setStatus)((value as EmployeeDebtStatusFilter | undefined) ?? DEFAULT_STATUS)}
          options={(Object.keys(EMPLOYEE_DEBT_STATUS_LABEL) as EmployeeDebtStatusFilter[]).map((value) => ({
            value,
            label: EMPLOYEE_DEBT_STATUS_LABEL[value],
          }))}
        />
        <FilterSelect
          aria-label="Trabajador"
          allLabel="Todos los trabajadores"
          className="w-56"
          value={employeeFilter}
          onChange={withPageReset(setEmployeeFilter)}
          options={(allEmployees?.data ?? []).map((row) => ({ value: String(row.user_id), label: row.employee_name }))}
        />
        <DateRangeFilter placeholder="Fecha de la compra" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<EmployeeDebtSummaryItem>
        columns={[
          { header: 'Trabajador', cell: (row) => row.employee_name },
          ...(showPending
            ? [
                {
                  header: 'Compras pendientes',
                  cell: (row: EmployeeDebtSummaryItem) => <Badge variant="secondary">{row.pending_count}</Badge>,
                },
                {
                  header: 'Pendiente de pagar',
                  align: 'right' as const,
                  cell: (row: EmployeeDebtSummaryItem) => (
                    <span className={row.pending_amount > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {money(row.pending_amount)}
                    </span>
                  ),
                },
              ]
            : []),
          ...(showPaid
            ? [
                {
                  header: 'Ya pagado',
                  align: 'right' as const,
                  cell: (row: EmployeeDebtSummaryItem) => (
                    <span className="font-semibold text-[var(--success)]">{money(row.paid_amount)}</span>
                  ),
                },
                {
                  header: 'Último pago',
                  cell: (row: EmployeeDebtSummaryItem) =>
                    row.last_paid_at ? new Date(`${row.last_paid_at}T00:00:00`).toLocaleDateString('es-PE') : '—',
                },
              ]
            : []),
          {
            header: '',
            align: 'right',
            cell: (row) =>
              canPay && row.pending_amount > 0 ? (
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setPayingDebt(row)}>
                    Marcar como pagado
                  </Button>
                </div>
              ) : null,
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.user_id}
        isLoading={isLoading}
        emptyIcon={HandCoins}
        emptyTitle={status === 'paid' ? 'Todavía no se repuso ninguna deuda' : 'No hay deudas pendientes con el personal'}
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

      {payingDebt && <PayDebtDialog debt={payingDebt} onClose={() => setPayingDebt(null)} />}
    </div>
  );
}

// Reponer al trabajador: se elige desde qué cuenta salió el dinero (o
// efectivo). Con eso, en Caja cada gasto de esas compras pasa a decir
// "pagado por <trabajador> · repuesto el <fecha> desde <cuenta>".
function PayDebtDialog({ debt, onClose }: { debt: EmployeeDebtSummaryItem; onClose: () => void }) {
  const [accountId, setAccountId] = useState<number | null>(null);
  // Por defecto se ofrece saldar todo; el input queda editable para un
  // abono parcial (ej. S/50 de una deuda de S/200) — pedido de QA: antes
  // solo se podía cancelar el total.
  const [amountInput, setAmountInput] = useState(debt.pending_amount.toFixed(2));
  const { mutate: payDebt, isPending } = usePayEmployeeDebt();

  const amount = Number(amountInput);
  const isAmountValid = Number.isFinite(amount) && amount > 0 && amount <= debt.pending_amount + 0.009;

  const confirm = () => {
    if (!isAmountValid) return;
    payDebt(
      { userId: debt.user_id, dto: { payment_account_id: accountId, amount } },
      {
        onSuccess: () => {
          toast.success(amount >= debt.pending_amount ? 'Deuda saldada correctamente' : 'Abono registrado correctamente');
          onClose();
        },
        onError: (error) => toast.error((error as ApiClientError).message ?? 'No se pudo registrar el pago'),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar deuda como pagada</DialogTitle>
          <DialogDescription>
            {debt.employee_name} tiene {debt.pending_count} compra(s) pendientes por {money(debt.pending_amount)}. Puedes
            reponer todo o solo una parte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="debt-amount">Monto a reponer (S/)</Label>
          <input
            id="debt-amount"
            type="number"
            step="0.01"
            min="0.01"
            max={debt.pending_amount}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            className="border-input bg-card flex h-9 w-full rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          {!isAmountValid && (
            <p className="text-xs text-destructive">El monto debe ser mayor a 0 y no superar {money(debt.pending_amount)}.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="debt-account">¿De dónde salió el dinero para reponerle?</Label>
          <PaymentAccountSelect id="debt-account" value={accountId} onChange={setAccountId} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            <X className="size-4" />
            Cancelar
          </Button>
          <Button onClick={confirm} disabled={isPending || !isAmountValid}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {amount < debt.pending_amount ? 'Registrar abono' : 'Marcar como pagado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
