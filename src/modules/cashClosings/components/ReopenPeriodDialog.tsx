import { zodResolver } from '@hookform/resolvers/zod';
import { LockOpen } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useCashPeriodStatus, useReopenCashPeriod } from '@/modules/cashClosings/hooks/useCashClosings';
import { reasonOnlySchema, type ReasonOnlyFormValues } from '@/modules/cashClosings/schemas/cashClosings.schema';
import { formatPeriodEs, formatPeriodTitle } from '@/modules/cashClosings/utils/period';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

interface ReopenPeriodDialogProps {
  period: string;
  companyId?: number;
  onClose: () => void;
}

// Reabrir un mes cerrado: pide el motivo (queda en el historial) y confirma.
export function ReopenPeriodDialog({ period, companyId, onClose }: ReopenPeriodDialogProps) {
  const { mutateAsync: reopenPeriod } = useReopenCashPeriod();
  const [pendingReason, setPendingReason] = useState<string | null>(null);
  const monthName = formatPeriodEs(period).split(' ')[0] ?? period;
  // Meses cerrados DESPUÉS de este (siguen cerrados al reabrir); el estado ya
  // está en cache (lo usa la página de cierres).
  const { data: status } = useCashPeriodStatus(companyId);
  const laterClosed = (status?.closed_periods ?? []).filter((closed) => closed > period).sort();
  const laterClosedText = laterClosed.map(formatPeriodEs).join(', ');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReasonOnlyFormValues>({ resolver: zodResolver(reasonOnlySchema), defaultValues: { reason: '' } });

  const confirmReopen = async () => {
    if (pendingReason === null) return;
    // try/catch solo para avisar: el mensaje ya viene normalizado.
    try {
      await reopenPeriod({ period, dto: { company_id: companyId, reason: pendingReason } });
      toast.success(`${formatPeriodTitle(period)} reabierto`);
      setPendingReason(null);
      onClose();
    } catch (mutationError) {
      setPendingReason(null);
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo reabrir el mes');
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" data-testid="reopen-period-dialog">
          <DialogHeader>
            <DialogTitle>Reabrir {formatPeriodEs(period)}</DialogTitle>
            <DialogDescription>
              Reabrir permite volver a registrar y corregir directamente movimientos de {monthName}.
              {laterClosed.length > 0 &&
                ` Los meses cerrados después (${laterClosedText}) siguen cerrados, pero su saldo inicial se recalculará cuando vuelvas a cerrar ${monthName}.`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => setPendingReason(values.reason))} className="space-y-4">
            <CorrectionReasonField
              id="reopen-period-reason"
              label="Motivo de la reapertura"
              registration={register('reason')}
              error={errors.reason?.message}
              placeholder="Ej.: falta registrar el depósito del cliente X del 28/10"
            />
            <DialogFooter>
              <Button type="submit">
                <LockOpen className="size-4" />
                Continuar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingReason !== null}
        onOpenChange={(open) => !open && setPendingReason(null)}
        title={`¿Reabrir ${formatPeriodEs(period)}?`}
        description={`El mes quedará abierto hasta que vuelvas a cerrarlo. Motivo: ${pendingReason ?? ''}`}
        confirmLabel="Reabrir mes"
        variant="destructive"
        onConfirm={confirmReopen}
      />
    </>
  );
}
