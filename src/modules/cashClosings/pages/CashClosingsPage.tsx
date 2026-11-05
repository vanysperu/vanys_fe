import { Landmark, Lock, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { CashOpeningDialog } from '@/modules/cashClosings/components/CashOpeningDialog';
import { CashPeriodDetail } from '@/modules/cashClosings/components/CashPeriodDetail';
import { CashPeriodStatusBadge } from '@/modules/cashClosings/components/CashPeriodStatusBadge';
import { useCashClosings, useCashOpening, useCashPeriodStatus } from '@/modules/cashClosings/hooks/useCashClosings';
import type { CashClosingListItem } from '@/modules/cashClosings/types/cashClosings.types';
import { formatPeriodTitle } from '@/modules/cashClosings/utils/period';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { cn } from '@/lib/utils';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Button } from '@/presentation/components/shared/ui/button';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const PAGE_SIZE = 12;

// Cierres de caja (solo administradores): una línea de tiempo con los meses y,
// al lado, el detalle del mes elegido. Cada mes cerrado queda fijo; si luego se
// corrige algo de ese mes, la diferencia se registra como un ajuste.
export function CashClosingsPage() {
  const [page, setPage] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState<string | undefined>(undefined);
  const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);
  const [openingDialog, setOpeningDialog] = useState(false);
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });
  const companyId = companyFilter ? Number(companyFilter) : undefined;
  // El Super Administrador tiene que elegir una empresa (cada una tiene su caja).
  const ready = !isSystem || companyId !== undefined;
  const canEditOpening = usePermissionButton('cash_closing.opening.button');

  const { data: status } = useCashPeriodStatus(companyId, { enabled: ready });
  const started = status?.started ?? false;
  const { data: opening } = useCashOpening(companyId, { enabled: ready && started && canEditOpening });
  const { data: list, isLoading } = useCashClosings({ companyId, page, limit: PAGE_SIZE }, { enabled: ready && started });

  const items = list?.data ?? [];
  // Por defecto: el primer mes que se puede cerrar y, si no hay, el más reciente.
  const defaultPeriod = items.find((item) => item.closable)?.period ?? items[0]?.period;
  const activePeriod = selectedPeriod ?? defaultPeriod;

  const handleCompany = (value: string | undefined) => {
    setCompanyFilter(value);
    setSelectedPeriod(undefined);
    setPage(1);
  };

  const showOpeningButton = canEditOpening && ready && (!started || opening?.editable === true);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cierres de caja"
        description="Cada mes cerrado queda fijo: sus números ya no cambian. Si después se corrige algo de ese mes, la diferencia se registra como un ajuste en el mes abierto, con su motivo."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {isSystem && (
              <FilterSelect
                aria-label="Empresa"
                allLabel="Selecciona una empresa"
                className="w-56"
                value={companyFilter}
                onChange={handleCompany}
                options={(companies?.data ?? []).map((row) => ({ value: String(row.id), label: row.business_name }))}
              />
            )}
            {showOpeningButton && (
              <Button type="button" variant="outline" onClick={() => setOpeningDialog(true)} data-testid="opening-button">
                <Settings2 className="size-4" />
                Saldo inicial
              </Button>
            )}
          </div>
        }
      />

      {!ready && (
        <EmptyState icon={Landmark} title="Selecciona una empresa" description="Cada empresa tiene su propia caja y sus propios cierres." />
      )}

      {ready && status && !started && (
        <div className="space-y-4" data-testid="cash-not-started">
          <EmptyState
            icon={Lock}
            title="Todavía no se configuró la caja"
            description="Indica con cuánto dinero empezó cada cuenta (efectivo, bancos, Yape, Plin) y desde ese mes el sistema calcula los saldos y te deja cerrar cada mes."
          />
          {canEditOpening && (
            <div className="flex justify-center">
              <Button type="button" onClick={() => setOpeningDialog(true)} data-testid="opening-cta">
                Configurar saldo inicial
              </Button>
            </div>
          )}
        </div>
      )}

      {ready && started && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-3">
            <DataTable<CashClosingListItem>
              columns={[
                {
                  header: 'Mes',
                  cell: (row) => (
                    <button
                      type="button"
                      aria-pressed={row.period === activePeriod}
                      onClick={() => setSelectedPeriod(row.period)}
                      data-testid={`period-${row.period}`}
                      className={cn(
                        'text-left font-medium underline-offset-2 hover:underline',
                        row.period === activePeriod && 'text-primary',
                      )}
                    >
                      {formatPeriodTitle(row.period)}
                    </button>
                  ),
                },
                { header: 'Estado', cell: (row) => <CashPeriodStatusBadge item={row} /> },
                {
                  header: 'Saldo final',
                  align: 'right',
                  cell: (row) => (row.totals ? <span className="whitespace-nowrap">{formatMoney(row.totals.closing)}</span> : '—'),
                },
                // Lo que quedó después de pagar el IGV (detalle completo en el panel).
                {
                  header: 'Neto tras IGV',
                  align: 'right',
                  cell: (row) =>
                    row.finance ? (
                      <span className={cn('whitespace-nowrap', row.finance.net_after_igv < 0 && 'text-destructive')}>
                        {formatMoney(row.finance.net_after_igv)}
                      </span>
                    ) : (
                      '—'
                    ),
                },
                // "Cerrado por" no va en esta lista angosta (se cortaba junto al
                // panel de detalle): el detalle del mes ya dice quién y cuándo.
              ]}
              rows={items}
              rowKey={(row) => row.period}
              isLoading={isLoading}
              emptyIcon={Lock}
              emptyTitle="Todavía no hay meses para mostrar"
            />
            {list && (
              <Pagination
                result={{ page: list.meta.page, pageSize: list.meta.limit, totalCount: list.meta.total }}
                onPageChange={setPage}
              />
            )}
          </div>

          <div className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
            {activePeriod ? (
              <CashPeriodDetail key={`${companyId ?? 'own'}-${activePeriod}`} period={activePeriod} companyId={companyId} />
            ) : (
              <EmptyState icon={Lock} title="Elige un mes para ver su detalle" />
            )}
          </div>
        </div>
      )}

      {openingDialog && <CashOpeningDialog companyId={companyId} onClose={() => setOpeningDialog(false)} />}
    </div>
  );
}
