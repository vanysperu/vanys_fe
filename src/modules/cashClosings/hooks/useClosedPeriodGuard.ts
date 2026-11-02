import { useCashPeriodStatus } from '@/modules/cashClosings/hooks/useCashClosings';
import { closedPeriodLabelOf, isDateInClosedPeriod, lockedDatesExcept } from '@/modules/cashClosings/utils/period';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Capacidad de ajustar meses cerrados (cash_closing.adjust.button, sin
// endpoint propio): el backend responde 403 CASH_PERIOD_ADJUST_FORBIDDEN al
// corregir/anular una fila de un mes cerrado sin ella. El front solo la usa
// para no ofrecer acciones que el backend va a rechazar.
export const CASH_ADJUST_BUTTON = 'cash_closing.adjust.button';

// ¿Puede el usuario corregir/anular filas de un mes cerrado? El Super
// Administrador siempre (resolveWriteScope del backend).
export function useCanAdjustClosedPeriods(): boolean {
  const { data: access } = useAccess();
  const hasButton = usePermissionButton(CASH_ADJUST_BUTTON);
  return hasButton || (access?.isSystem ?? false);
}

// Para los formularios de corrección: dice si la fecha original del
// movimiento está en un mes cerrado (para mostrar el aviso) y da el predicado
// que bloquea en el calendario las fechas de meses cerrados (la original sí
// se puede dejar). El Super Administrador debe pasar la empresa del registro.
export function useClosedPeriodGuard(companyId: number | undefined, originalDate: string | undefined) {
  const { data: access } = useAccess();
  const isSystem = access?.isSystem ?? false;
  const { data: status } = useCashPeriodStatus(companyId, { enabled: !isSystem || companyId !== undefined });
  const canAdjustClosed = useCanAdjustClosedPeriods();

  return {
    status,
    // 'octubre 2026' si la fecha original cae en un mes cerrado; si no, null.
    closedLabel: closedPeriodLabelOf(status, originalDate),
    lockedDates: lockedDatesExcept(status, originalDate),
    canAdjustClosed,
    // true = la fila es de un mes cerrado y el usuario no puede ajustarlo:
    // se ocultan sus acciones de corregir/anular/restaurar.
    actionsLocked: (date: string | null | undefined): boolean => !canAdjustClosed && isDateInClosedPeriod(status, date),
  };
}
