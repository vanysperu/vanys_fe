import { History } from 'lucide-react';
import { useState } from 'react';

import { useCashPeriodEvents } from '@/modules/cashClosings/hooks/useCashClosings';
import { describeCashPeriodEvent } from '@/modules/cashClosings/utils/events';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Pagination } from '@/presentation/components/shared/Pagination';

const PAGE_SIZE = 5;

interface PeriodEventsListProps {
  period: string;
  companyId?: number;
}

// Historial de lo que pasó con el mes: quién lo cerró, reabrió o recalculó.
export function PeriodEventsList({ period, companyId }: PeriodEventsListProps) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCashPeriodEvents({ period, companyId, page, limit: PAGE_SIZE });
  const events = data?.data ?? [];

  return (
    <section className="space-y-3" data-testid="cash-period-events">
      <h3 className="text-sm font-semibold">Historial del mes</h3>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando historial...</p>}
      {!isLoading && events.length === 0 && <EmptyState icon={History} title="Este mes todavía no tiene movimientos de cierre" />}
      <ol className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="rounded-lg border p-3 text-sm [overflow-wrap:anywhere]">
            {describeCashPeriodEvent(event)}
          </li>
        ))}
      </ol>
      {data && data.meta.total > PAGE_SIZE && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
