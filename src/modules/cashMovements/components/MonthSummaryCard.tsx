import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { todayLocalDateString } from '@/lib/dateUtils';
import { formatPeriodEs, periodOf, shiftPeriod } from '@/modules/cashClosings/utils/period';
import { PeriodFinanceTiles } from '@/modules/cashMovements/components/PeriodFinanceTiles';
import { useMonthSummary } from '@/modules/cashMovements/hooks/useCashMovements';
import { Button } from '@/presentation/components/shared/ui/button';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

interface MonthSummaryCardProps {
  companyId?: number;
  enabled: boolean;
}

// "La ganancia que va del mes" y el IGV para SUNAT (pedido explícito del
// usuario). Por defecto el mes en curso; con las flechas, meses anteriores.
// Mismos ingresos/egresos que Caja y Estadísticas (sin los filtros de la lista).
export function MonthSummaryCard({ companyId, enabled }: MonthSummaryCardProps) {
  const currentPeriod = periodOf(todayLocalDateString());
  const [period, setPeriod] = useState(currentPeriod);
  const { data: summary, isLoading } = useMonthSummary({ period, companyId }, enabled);

  if (!enabled) return null;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm" data-testid="cash-month-summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            Resultado de {formatPeriodEs(period)}
            {summary?.is_current && <span className="font-normal text-muted-foreground"> (lo que va del mes)</span>}
          </p>
          <p className="text-xs text-muted-foreground">Todo lo que entró y salió de la caja en el mes, y el IGV que toca pagar.</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => setPeriod(shiftPeriod(period, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Mes siguiente"
            disabled={period >= currentPeriod}
            onClick={() => setPeriod(shiftPeriod(period, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {isLoading || !summary ? <Skeleton className="h-20 w-full" /> : <PeriodFinanceTiles finance={summary} />}
    </div>
  );
}
