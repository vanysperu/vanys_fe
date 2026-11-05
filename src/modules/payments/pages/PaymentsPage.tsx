import { CreditCard, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';

import { useVariableGenerals } from '@/modules/variableGeneral/hooks/useVariableGeneral';
import { CorrectPaymentDialog } from '@/modules/payments/components/CorrectPaymentDialog';
import { usePayments, useTogglePaymentStatus } from '@/modules/payments/hooks/usePayments';
import { CorrectedBadge } from '@/modules/moneyCorrections/components/CorrectedBadge';
import { CorrectionHistoryDialog } from '@/modules/moneyCorrections/components/CorrectionHistoryDialog';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { usePaymentAccounts } from '@/modules/variableGeneral/components/PaymentAccountSelect';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import type { PaymentStatusFilter } from '@/modules/payments/types/payment.types';
import type { PaymentListItem } from '@/modules/payments/types/payment.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { formatDate } from '@/lib/dateUtils';

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
  // Pago que se está corrigiendo y pago cuyo historial se está mirando.
  const [correctingPaymentId, setCorrectingPaymentId] = useState<number | null>(null);
  const [historyPayment, setHistoryPayment] = useState<PaymentListItem | null>(null);
  // Filtros (pedido explícito del usuario: rangos de fecha, estados, personas).
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [methodFilter, setMethodFilter] = useState<string | undefined>(undefined);
  const [accountFilter, setAccountFilter] = useState<string | undefined>(undefined);
  const [clientName, setClientName] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const { data: accountsForFilter } = usePaymentAccounts();

  const canUpdate = usePermissionButton('payment.update.button');
  const canDisable = usePermissionButton('payment.disable.button');
  const canViewHistory = usePermissionButton('payment.corrections.button');

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
  const { mutateAsync: toggleStatus, isPending: isToggling } = useTogglePaymentStatus();
  // Anular o restaurar un pago de un mes cerrado se registra como ajuste y pide motivo.
  // actionsLocked: fila de un mes cerrado sin permiso de ajustar → sin acciones.
  const { status: periodStatus, actionsLocked } = useClosedPeriodGuard(undefined, undefined);
  const adjustmentReason = useAdjustmentReason<PaymentListItem>({
    run: (row, reason) => toggleStatus({ id: row.id, reason }),
    successMessage: (row) => (row.is_deleted ? 'Pago restaurado como ajuste de un mes cerrado' : 'Pago anulado como ajuste de un mes cerrado'),
    fallbackErrorMessage: 'No se pudo actualizar el pago',
  });
  const togglePayment = async (row: PaymentListItem) => {
    const action = row.is_deleted ? 'restore' : 'annul';
    const closedLabel = closedPeriodLabelOf(periodStatus, row.paid_at);
    if (closedLabel) {
      adjustmentReason.open(row, action, closedLabel);
      return;
    }
    // try/catch solo para avisar o pedir el motivo si el servidor lo exige.
    try {
      await toggleStatus({ id: row.id });
      toast.success(row.is_deleted ? 'Pago restaurado' : 'Pago anulado');
    } catch (mutationError) {
      if (adjustmentReason.absorbError(mutationError, row, action)) return;
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo actualizar el pago');
    }
  };

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
          { header: 'Fecha', cell: (row) => formatDate(row.paid_at) },
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
            cell: (row) => (
              <>
                <Badge variant={row.is_deleted ? 'destructive' : 'success'}>{row.is_deleted ? 'Anulado' : 'Activo'}</Badge>
                <CorrectedBadge
                  count={row.corrections_count}
                  canOpen={canViewHistory}
                  onOpen={() => setHistoryPayment(row)}
                />
              </>
            ),
          },
          {
            header: '',
            align: 'right',
            cell: (row) => (
              <div className="flex justify-end gap-1">
                {canUpdate && !row.is_deleted && !actionsLocked(row.paid_at) && (
                  <button
                    type="button"
                    title="Corregir pago"
                    onClick={() => setCorrectingPaymentId(row.id)}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                )}
                {canDisable && !actionsLocked(row.paid_at) && (
                  <ToggleStatusButton
                    active={!row.is_deleted}
                    disabled={isToggling}
                    entityLabel="pago"
                    onToggle={() => togglePayment(row)}
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

      {adjustmentReason.dialog}
      {correctingPaymentId !== null && (
        <CorrectPaymentDialog paymentId={correctingPaymentId} onClose={() => setCorrectingPaymentId(null)} />
      )}
      {historyPayment && (
        <CorrectionHistoryDialog
          title={`Pago de COT-${String(historyPayment.quotation_id).padStart(4, '0')} · ${historyPayment.client_name}`}
          historyUrl={`/payment/${historyPayment.id}/corrections`}
          queryKey={moneyCorrectionsKeys.history('quotation_payment', historyPayment.id)}
          onClose={() => setHistoryPayment(null)}
        />
      )}
    </div>
  );
}
