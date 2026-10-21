import { BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { resolvePresetRange, type PeriodRange } from '@/lib/periodPresets';
import { cn } from '@/lib/utils';
import { useBusinessUnits } from '@/modules/platform/hooks/useBusinessUnits';
import { useCompanies } from '@/modules/platform/hooks/useCompanies';
import { IncomeExpensesChart } from '@/modules/statistics/components/IncomeExpensesChart';
import { KpiSection } from '@/modules/statistics/components/KpiSection';
import { QuotedWonChart } from '@/modules/statistics/components/QuotedWonChart';
import {
  PaymentsByAccountCard,
  StatusBreakdownCard,
  TopClientsCard,
  TopProductsCard,
  TopTechniquesCard,
} from '@/modules/statistics/components/RankingCards';
import { ReceivablesAgingChart } from '@/modules/statistics/components/ReceivablesAgingChart';
import { SellersTable } from '@/modules/statistics/components/SellersTable';
import { useStatisticsOverview } from '@/modules/statistics/hooks/useStatisticsOverview';
import { formatDate } from '@/modules/statistics/utils/format';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { FiltersBar } from '@/presentation/components/shared/FiltersBar';
import { FilterSelect } from '@/presentation/components/shared/FilterSelect';
import { PageHeader } from '@/presentation/components/shared/PageHeader';
import { PeriodFilter, type PeriodFilterValue } from '@/presentation/components/shared/PeriodFilter';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { useAccess } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

const DEFAULT_PERIOD: PeriodFilterValue = { preset: 'last30', customRange: {} };

// Rango efectivo del filtro. Un rango personalizado a medio elegir (sin las
// dos fechas) todavía no consulta: se mantiene el último tablero.
function resolveRange(period: PeriodFilterValue): PeriodRange | null {
  if (period.preset !== 'custom') return resolvePresetRange(period.preset);
  const { dateFrom, dateTo } = period.customRange;
  return dateFrom && dateTo ? { dateFrom, dateTo } : null;
}

// Estadísticas (pedido explícito del usuario: "estadísticas que en verdad nos
// sirvan"): cuánto se cobra y se gasta, cuánto se cotiza y se cierra, qué
// clientes y productos mueven el negocio, qué falta cobrar y cómo rinde cada
// vendedor. Todo sale de una sola consulta agregada del backend, que además
// aplica el alcance de empresa/tienda del usuario.
export function StatisticsPage() {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const canFilterByStore = !isSystem && Boolean(access?.modules.includes('platform'));

  const [period, setPeriod] = useState<PeriodFilterValue>(DEFAULT_PERIOD);
  const [lastRange, setLastRange] = useState<PeriodRange>(() => resolvePresetRange('last30'));
  const [businessUnitFilter, setBusinessUnitFilter] = useState<string | undefined>(undefined);
  const [companyFilter, setCompanyFilter] = useState<string | undefined>(undefined);

  const { data: businessUnits } = useBusinessUnits({ page: 1, limit: 100 }, { enabled: canFilterByStore });
  const { data: companies } = useCompanies({ page: 1, limit: 100 }, { enabled: isSystem });

  const range = resolveRange(period) ?? lastRange;
  const { data, isLoading, isError, error, isPlaceholderData } = useStatisticsOverview({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    businessUnitId: businessUnitFilter ? Number(businessUnitFilter) : undefined,
    companyId: companyFilter ? Number(companyFilter) : undefined,
  });

  const changePeriod = (next: PeriodFilterValue) => {
    setPeriod(next);
    const nextRange = resolveRange(next);
    if (nextRange) setLastRange(nextRange);
  };

  const hasActiveFilters = period.preset !== DEFAULT_PERIOD.preset || Boolean(businessUnitFilter || companyFilter);
  const clearFilters = () => {
    changePeriod(DEFAULT_PERIOD);
    setBusinessUnitFilter(undefined);
    setCompanyFilter(undefined);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Estadísticas" description="Cómo va el negocio: ventas, cobros, clientes, productos y vendedores" />

      <div className="space-y-2">
        <FiltersBar hasActiveFilters={hasActiveFilters} onClear={clearFilters}>
          <PeriodFilter value={period} onChange={changePeriod} />
          {canFilterByStore && (
            <FilterSelect
              aria-label="Tienda"
              allLabel="Todas las tiendas"
              value={businessUnitFilter}
              onChange={setBusinessUnitFilter}
              options={(businessUnits?.data ?? []).map((unit) => ({ value: String(unit.id), label: unit.business_code }))}
            />
          )}
          {isSystem && (
            <FilterSelect
              aria-label="Empresa"
              allLabel="Todas las empresas"
              className="w-56"
              value={companyFilter}
              onChange={setCompanyFilter}
              options={(companies?.data ?? []).map((company) => ({ value: String(company.id), label: company.business_name }))}
            />
          )}
        </FiltersBar>
        {data && (
          <p className="text-xs text-muted-foreground" data-testid="statistics-period">
            Del {formatDate(data.period.date_from)} al {formatDate(data.period.date_to)} · se compara con{' '}
            {formatDate(data.period.previous_from)} – {formatDate(data.period.previous_to)}
          </p>
        )}
      </div>

      {isLoading && <StatisticsSkeleton />}

      {isError && !data && (
        <EmptyState
          icon={BarChart3}
          title="No se pudieron cargar las estadísticas"
          description={(error as ApiClientError | null)?.message ?? 'Intenta de nuevo en unos segundos'}
        />
      )}

      {data && (
        // Mientras llega el periodo nuevo, el tablero anterior se queda
        // atenuado: sin parpadeo ni saltos de diseño.
        <div
          className={cn('space-y-4 transition-opacity', isPlaceholderData && 'opacity-60')}
          aria-busy={isPlaceholderData}
          data-testid="statistics-dashboard"
        >
          <KpiSection
            current={data.kpis.current}
            previous={data.kpis.previous}
            aging={data.receivables_aging}
          />

          <IncomeExpensesChart trend={data.trend} granularity={data.period.granularity} />
          <QuotedWonChart trend={data.trend} granularity={data.period.granularity} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StatusBreakdownCard breakdown={data.status_breakdown} />
            <ReceivablesAgingChart aging={data.receivables_aging} />
            <TopClientsCard clients={data.top_clients} />
            <TopProductsCard products={data.top_products} />
            <TopTechniquesCard techniques={data.top_techniques} />
            <PaymentsByAccountCard accounts={data.payments_by_account} />
          </div>

          <SellersTable sellers={data.sellers} />
        </div>
      )}
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-36 sm:col-span-2 lg:row-span-2 lg:h-auto" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  );
}
