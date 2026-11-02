import { CircleDashed, Lock, LockOpen, TimerReset } from 'lucide-react';

import type { CashClosingListItem } from '@/modules/cashClosings/types/cashClosings.types';
import { formatDateEs } from '@/modules/cashClosings/utils/period';
import { Badge } from '@/presentation/components/shared/ui/badge';


interface CashPeriodStatusBadgeProps {
  item: Pick<
    CashClosingListItem,
    'status' | 'closable' | 'is_provisional' | 'reopened_by_name' | 'reopened_at' | 'reopen_reason'
  >;
}

// Etiqueta de estado de un mes: Abierto / Listo para cerrar / Cerrado /
// Reabierto, más "Saldo inicial provisional" cuando un mes anterior se
// reabrió (su saldo inicial se recalcula al volver a cerrar).
export function CashPeriodStatusBadge({ item }: CashPeriodStatusBadgeProps) {
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <StatusChip item={item} />
      {item.is_provisional && (
        <span className="text-[10px] font-medium text-warning" data-testid="cash-period-provisional">
          Saldo inicial provisional
        </span>
      )}
    </span>
  );
}

function StatusChip({ item }: CashPeriodStatusBadgeProps) {
  if (item.status === 'closed') {
    return (
      <Badge variant="success" data-testid="cash-period-status">
        <Lock className="size-3" />
        Cerrado
      </Badge>
    );
  }

  if (item.status === 'reopened') {
    const by = item.reopened_by_name ?? 'un administrador';
    const when = item.reopened_at ? ` el ${formatDateEs(item.reopened_at.date)}` : '';
    const reason = item.reopen_reason ? `: ${item.reopen_reason}` : '';
    return (
      <Badge variant="warning" title={`Reabierto por ${by}${when}${reason}`} data-testid="cash-period-status">
        <LockOpen className="size-3" />
        Reabierto
      </Badge>
    );
  }

  if (item.closable) {
    return (
      <Badge variant="warning" data-testid="cash-period-status">
        <TimerReset className="size-3" />
        Listo para cerrar
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" data-testid="cash-period-status">
      <CircleDashed className="size-3" />
      Abierto
    </Badge>
  );
}
