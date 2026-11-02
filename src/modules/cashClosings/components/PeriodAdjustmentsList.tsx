import { Scale } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { useCashPeriodAdjustments } from '@/modules/cashClosings/hooks/useCashClosings';
import type {
  CashAdjustmentAction,
  CashAdjustmentsType,
  CashPeriodAdjustmentItem,
} from '@/modules/cashClosings/types/cashClosings.types';
import { formatDateEs } from '@/modules/cashClosings/utils/period';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import type { MoneyCorrectionSource } from '@/modules/moneyCorrections/types/moneyCorrection.types';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Tabs, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';

const PAGE_SIZE = 5;

const SOURCE_LABEL: Record<MoneyCorrectionSource, string> = {
  manual: 'Movimiento',
  quotation_payment: 'Pago',
  quotation_expense: 'Gasto',
  employee_debt: 'Deuda a personal',
  employee_debt_payment: 'Reposición',
};

const ACTION_LABEL: Record<CashAdjustmentAction, string> = {
  correction: 'corregido',
  annul: 'anulado',
  restore: 'restaurado',
};

const code = (prefix: string, id: number) => `${prefix}-${String(id).padStart(4, '0')}`;

// "Pago #12 · COT-0045 · de septiembre 2026"
function describeOrigin(item: CashPeriodAdjustmentItem): string {
  const parts = [`${SOURCE_LABEL[item.source_type]} #${item.source_id}`];
  if (item.quotation_id) parts.push(code('COT', item.quotation_id));
  if (item.purchase_order_id) parts.push(code('OC', item.purchase_order_id));
  parts.push(`de ${item.affected_period_label}`);
  return parts.join(' · ');
}

interface PeriodAdjustmentsListProps {
  period: string;
  periodTitle: string;
  companyId?: number;
  counts: { adjustments_posted: number; adjustments_affecting: number };
}

// Ajustes de un mes en dos vistas:
//  - "registrados en este mes": diferencias de meses anteriores que se
//    anotaron acá (cambian este mes);
//  - "hechos después del cierre": correcciones a movimientos de este mes ya
//    cerrado (no cambian el cierre; su diferencia se anotó en otro mes).
export function PeriodAdjustmentsList({ period, periodTitle, companyId, counts }: PeriodAdjustmentsListProps) {
  const [type, setType] = useState<CashAdjustmentsType>('posted');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCashPeriodAdjustments({ period, type, companyId, page, limit: PAGE_SIZE });

  const changeType = (next: string) => {
    setType(next as CashAdjustmentsType);
    setPage(1);
  };

  return (
    <section className="space-y-3" data-testid="cash-period-adjustments">
      <h3 className="text-sm font-semibold">Ajustes</h3>
      <Tabs value={type} onValueChange={changeType}>
        <TabsList>
          <TabsTrigger value="posted">Registrados en este mes ({counts.adjustments_posted})</TabsTrigger>
          <TabsTrigger value="affecting">Hechos después del cierre ({counts.adjustments_affecting})</TabsTrigger>
        </TabsList>
      </Tabs>
      {type === 'affecting' && (
        <p className="text-xs text-muted-foreground">
          Estos cambios se hicieron después de cerrar {periodTitle.toLowerCase()}. No cambian este cierre: su diferencia se
          registró en el mes indicado.
        </p>
      )}
      {type === 'posted' && (
        <p className="text-xs text-muted-foreground">
          Correcciones de meses ya cerrados que se anotaron en {periodTitle.toLowerCase()}, con su motivo.
        </p>
      )}

      <DataTable<CashPeriodAdjustmentItem>
        columns={[
          { header: 'Fecha', cell: (row) => formatDateEs(row.entry_date) },
          {
            header: 'Origen',
            className: 'min-w-44',
            cell: (row) => (
              <span>
                {describeOrigin(row)}
                <span className="block text-[10px] text-muted-foreground">{ACTION_LABEL[row.action]}</span>
              </span>
            ),
          },
          { header: 'Cuenta', cell: (row) => row.payment_account_name },
          {
            header: 'Monto',
            align: 'right',
            cell: (row) => (
              <span className={cn('whitespace-nowrap font-semibold', row.net_effect < 0 ? 'text-destructive' : 'text-[var(--success)]')}>
                {row.net_effect < 0 ? '-' : '+'} {formatMoney(Math.abs(row.net_effect))}
              </span>
            ),
          },
          { header: 'Motivo', className: 'min-w-40', cell: (row) => <span className="[overflow-wrap:anywhere]">{row.reason}</span> },
          { header: 'Por', cell: (row) => row.created_by_name ?? '—' },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={Scale}
        emptyTitle="Sin ajustes"
        emptyDescription={
          type === 'posted'
            ? 'Todavía no se anotó en este mes ninguna corrección de meses cerrados.'
            : 'Después del cierre no se corrigió nada de este mes.'
        }
      />
      {data && data.meta.total > PAGE_SIZE && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
