import { Banknote, Eye, Pencil, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { formatSoles } from '@/lib/money';
import { LoanDetailDialog } from '@/modules/loans/components/LoanDetailDialog';
import { LoanFormDialog } from '@/modules/loans/components/LoanFormDialog';
import { LoanStatusBadge } from '@/modules/loans/components/LoanStatusBadge';
import { useLoans, useToggleLoanStatus } from '@/modules/loans/hooks/useLoans';
import { LOAN_STATUS_LABEL, type Loan, type LoanStatus } from '@/modules/loans/types/loan.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { DateRangeFilter, type DateRangeValue } from '@/presentation/components/shared/DateRangeFilter';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { StatTile } from '@/presentation/components/shared/StatTile';
import { ToggleStatusButton } from '@/presentation/components/shared/ToggleStatusButton';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const STATUS_OPTIONS = (Object.keys(LOAN_STATUS_LABEL) as LoanStatus[]).map((value) => ({ value, label: LOAN_STATUS_LABEL[value] }));

// Préstamos a personas (pedido del usuario, 21-nov): a quién, cuánto, qué %
// de interés, cuánto se cobró y cuánto falta. Misma composición que los
// catálogos (CLAUDE.md §7): PageHeader con buscador y "Nuevo" → tabla con
// acciones a la derecha (ver → editar → anular) → paginación.
export function LoansPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editLoan, setEditLoan] = useState<Loan | null>(null);
  const canCreate = usePermissionButton('loan.create.button');
  const canUpdate = usePermissionButton('loan.update.button');
  const canDisable = usePermissionButton('loan.disable.button');
  const { mutate: toggleStatus, isPending: isToggling } = useToggleLoanStatus();

  const { data, isLoading } = useLoans({
    page,
    limit: pageSize,
    search: search.trim() || undefined,
    status: status as LoanStatus | undefined,
    dateFrom: dateRange.dateFrom,
    dateTo: dateRange.dateTo,
  });
  const withPageReset =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Préstamos"
        description="Dinero que la empresa prestó a personas: interés, cobros y saldo"
        action={
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar persona o documento..."
                className="w-full pl-9 sm:w-64"
                value={search}
                onChange={(event) => withPageReset(setSearch)(event.target.value)}
              />
            </div>
            {canCreate && <LoanFormDialog />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile label="Por cobrar (de lo filtrado)" value={formatSoles(data?.summary.outstanding_balance ?? 0)} />
        <StatTile label="Interés cobrado (de lo filtrado)" value={formatSoles(data?.summary.interest_collected ?? 0)} />
      </div>

      <FiltersBar>
        <FilterSelect aria-label="Estado" allLabel="Vigentes" value={status} onChange={withPageReset(setStatus)} options={STATUS_OPTIONS} />
        <DateRangeFilter placeholder="Fecha del préstamo" value={dateRange} onChange={withPageReset(setDateRange)} />
      </FiltersBar>

      <DataTable<Loan>
        columns={[
          {
            header: 'Persona',
            cell: (loan) => (
              <div className="min-w-0">
                <p className="font-medium">{loan.borrower_name}</p>
                {loan.borrower_document && <p className="text-xs text-muted-foreground">{loan.borrower_document}</p>}
              </div>
            ),
          },
          { header: 'Fecha', cell: (loan) => <span className="whitespace-nowrap">{formatDate(loan.loaned_at)}</span> },
          { header: 'Prestado', align: 'right', cell: (loan) => formatSoles(loan.principal) },
          {
            header: 'Interés',
            align: 'right',
            cell: (loan) => (
              <span className="whitespace-nowrap">
                {loan.interest_rate}% · {formatSoles(loan.interest_amount)}
              </span>
            ),
          },
          { header: 'Cobrado', align: 'right', cell: (loan) => formatSoles(loan.paid_amount) },
          {
            header: 'Saldo',
            align: 'right',
            cell: (loan) => <span className="font-semibold">{formatSoles(loan.balance)}</span>,
          },
          {
            header: 'Vence',
            cell: (loan) => <span className="whitespace-nowrap">{loan.due_date ? formatDate(loan.due_date) : '—'}</span>,
          },
          { header: 'Estado', cell: (loan) => <LoanStatusBadge status={loan.status} /> },
          {
            header: '',
            align: 'right',
            cell: (loan) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Ver el préstamo a ${loan.borrower_name}`}
                  title="Ver cobros"
                  onClick={() => setDetailId(loan.id)}
                >
                  <Eye className="size-4" />
                </Button>
                {canUpdate && loan.active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Editar el préstamo a ${loan.borrower_name}`}
                    onClick={() => setEditLoan(loan)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {canDisable && (
                  <ToggleStatusButton
                    active={loan.active}
                    disabled={isToggling}
                    entityLabel="préstamo"
                    onToggle={() =>
                      toggleStatus(loan.id, {
                        onSuccess: (updated) => toast.success(updated.active ? 'Préstamo restaurado' : 'Préstamo anulado'),
                        onError: (error) => toast.error((error as ApiClientError).message),
                      })
                    }
                  />
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(loan) => loan.id}
        isLoading={isLoading}
        emptyIcon={Banknote}
        emptyTitle="No hay préstamos"
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

      <LoanDetailDialog loanId={detailId} onClose={() => setDetailId(null)} />
      {editLoan && <LoanFormDialog loan={editLoan} onClose={() => setEditLoan(null)} />}
    </div>
  );
}
