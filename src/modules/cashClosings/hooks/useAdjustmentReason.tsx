import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { AdjustmentReasonDialog, type AdjustmentToggleAction } from '@/modules/cashClosings/components/AdjustmentReasonDialog';
import { adjustmentToastSuffix } from '@/modules/cashClosings/utils/adjustment';
import { formatPeriodEs } from '@/modules/cashClosings/utils/period';

// Código con el que el backend pide motivo al anular/restaurar un movimiento
// de un mes cerrado (se registra como ajuste).
export const ADJUSTMENT_REASON_REQUIRED = 'ADJUSTMENT_REASON_REQUIRED';

interface PendingAdjustment<TTarget> {
  target: TTarget;
  periodLabel: string | null;
  action: AdjustmentToggleAction;
}

interface UseAdjustmentReasonOptions<TTarget> {
  // Llama al endpoint de anular/restaurar mandando el motivo en el body.
  run: (target: TTarget, reason: string) => Promise<unknown>;
  successMessage: (target: TTarget, action: AdjustmentToggleAction) => string;
  fallbackErrorMessage: string;
}

interface UseAdjustmentReasonResult<TTarget> {
  // Abre el diálogo de motivo (el movimiento se sabe de un mes cerrado).
  open: (target: TTarget, action: AdjustmentToggleAction, periodLabel: string | null) => void;
  // Si el error es ADJUSTMENT_REASON_REQUIRED abre el diálogo y devuelve true;
  // si no, false (quien llama muestra el error como siempre).
  absorbError: (error: unknown, target: TTarget, action: AdjustmentToggleAction) => boolean;
  // Montar una vez en la pantalla.
  dialog: ReactNode;
}

// Periodo ('2026-10') que el backend manda en `errors.period` -> 'octubre 2026'.
function periodLabelFromError(error: ApiClientError): string | null {
  const details = error.errors;
  if (typeof details !== 'object' || details === null || !('period' in details)) return null;
  const period = (details as { period: unknown }).period;
  return typeof period === 'string' ? formatPeriodEs(period) : null;
}

// Flujo compartido de "anular/restaurar un movimiento de un mes cerrado":
// pide el motivo, lo manda y avisa. Lo usan Caja, Pagos recibidos, Gastos de
// cotización, Compras y Reposiciones, para que se comporten igual.
export function useAdjustmentReason<TTarget>({
  run,
  successMessage,
  fallbackErrorMessage,
}: UseAdjustmentReasonOptions<TTarget>): UseAdjustmentReasonResult<TTarget> {
  const [pending, setPending] = useState<PendingAdjustment<TTarget> | null>(null);

  const open: UseAdjustmentReasonResult<TTarget>['open'] = (target, action, periodLabel) =>
    setPending({ target, action, periodLabel });

  const absorbError: UseAdjustmentReasonResult<TTarget>['absorbError'] = (error, target, action) => {
    const apiError = error as ApiClientError;
    if (apiError.code !== ADJUSTMENT_REASON_REQUIRED) return false;
    setPending({ target, action, periodLabel: periodLabelFromError(apiError) });
    return true;
  };

  const submit = async (reason: string): Promise<void> => {
    if (!pending) return;
    // try/catch solo para avisar: el diálogo se queda abierto para reintentar.
    try {
      const result = await run(pending.target, reason);
      toast.success(successMessage(pending.target, pending.action) + adjustmentToastSuffix(result));
      setPending(null);
    } catch (mutationError) {
      toast.error((mutationError as ApiClientError).message ?? fallbackErrorMessage);
    }
  };

  const dialog = pending ? (
    <AdjustmentReasonDialog
      periodLabel={pending.periodLabel}
      action={pending.action}
      onSubmit={submit}
      onClose={() => setPending(null)}
    />
  ) : null;

  return { open, absorbError, dialog };
}
