import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { reasonOnlySchema, type ReasonOnlyFormValues } from '@/modules/cashClosings/schemas/cashClosings.schema';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

export type AdjustmentToggleAction = 'annul' | 'restore';

interface AdjustmentReasonDialogProps {
  // 'octubre 2026'. Null cuando solo se sabe que el mes está cerrado porque
  // el servidor lo pidió (ADJUSTMENT_REASON_REQUIRED sin detalle).
  periodLabel: string | null;
  action: AdjustmentToggleAction;
  // Envía el motivo; si falla, el diálogo se queda abierto (el aviso lo da
  // quien llama).
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}

const TITLE: Record<AdjustmentToggleAction, string> = {
  annul: 'Anular un movimiento de un mes cerrado',
  restore: 'Restaurar un movimiento de un mes cerrado',
};

// Anular o restaurar un movimiento de un mes ya cerrado no cambia ese cierre:
// se registra como un ajuste con fecha de hoy y pide el motivo.
export function AdjustmentReasonDialog({ periodLabel, action, onSubmit, onClose }: AdjustmentReasonDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ReasonOnlyFormValues>({ resolver: zodResolver(reasonOnlySchema), defaultValues: { reason: '' } });

  const verb = action === 'annul' ? 'la anulación' : 'la restauración';
  const month = periodLabel ? `${periodLabel.charAt(0).toUpperCase()}${periodLabel.slice(1)}` : 'El mes de este movimiento';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="adjustment-reason-dialog">
        <DialogHeader>
          <DialogTitle>{TITLE[action]}</DialogTitle>
          <DialogDescription>
            {month} ya está cerrado: {verb} se registrará como un ajuste con fecha de hoy. Indica el motivo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values.reason))} className="space-y-4">
          <CorrectionReasonField
            id="adjustment-reason"
            label="Motivo del ajuste"
            registration={register('reason')}
            error={errors.reason?.message}
            placeholder="Ej.: el cliente pidió la devolución del pago"
          />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isSubmitting ? 'Guardando...' : action === 'annul' ? 'Anular y registrar ajuste' : 'Restaurar y registrar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
