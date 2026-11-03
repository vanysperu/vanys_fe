import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { CashPeriodAccountsTable } from '@/modules/cashClosings/components/CashPeriodAccountsTable';
import { useCashPeriodDetail, useCloseCashPeriod } from '@/modules/cashClosings/hooks/useCashClosings';
import { closePeriodSchema, type ClosePeriodFormValues } from '@/modules/cashClosings/schemas/cashClosings.schema';
import { totalsOfDetail } from '@/modules/cashClosings/utils/totals';
import { formatPeriodEs, formatPeriodTitle } from '@/modules/cashClosings/utils/period';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

interface ClosePeriodDialogProps {
  period: string;
  companyId?: number;
  onClose: () => void;
}

// Cerrar un mes: muestra cómo quedaría (cuentas, bloqueos, advertencias) y,
// antes de cerrar de verdad, explica qué significa cerrar.
export function ClosePeriodDialog({ period, companyId, onClose }: ClosePeriodDialogProps) {
  const { data: detail, isLoading, isError, error } = useCashPeriodDetail(period, companyId);
  const { mutateAsync: closePeriod } = useCloseCashPeriod();
  const [pendingNotes, setPendingNotes] = useState<string | null>(null);
  const title = formatPeriodTitle(period);
  const monthName = formatPeriodEs(period).split(' ')[0] ?? title;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClosePeriodFormValues>({ resolver: zodResolver(closePeriodSchema), defaultValues: { notes: '' } });

  const confirmClose = async () => {
    if (pendingNotes === null) return;
    // try/catch solo para avisar: el mensaje ya viene normalizado.
    try {
      await closePeriod({ period, dto: { company_id: companyId, notes: pendingNotes.trim() || undefined } });
      toast.success(`${title} cerrado correctamente`);
      setPendingNotes(null);
      onClose();
    } catch (mutationError) {
      setPendingNotes(null);
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo cerrar el mes');
    }
  };

  const blockers = detail?.blockers ?? [];
  const warnings = detail?.warnings ?? [];

  const renderBody = () => {
    if (isLoading) return <p className="text-sm text-muted-foreground">Calculando cómo quedaría el mes...</p>;
    if (isError || !detail) {
      return <p className="text-sm text-destructive">{(error as ApiClientError | null)?.message ?? 'No se pudo cargar el mes'}</p>;
    }
    return (
      <form onSubmit={handleSubmit((values) => setPendingNotes(values.notes ?? ''))} className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Así quedaría {formatPeriodEs(period)} (vista previa)</p>
          <CashPeriodAccountsTable balances={detail.balances} totals={totalsOfDetail(detail)} />
        </div>

        {blockers.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" data-testid="close-blockers">
            {blockers.map((blocker) => (
              <li key={blocker.code} className="flex items-start gap-1.5">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                {blocker.message}
              </li>
            ))}
          </ul>
        )}
        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm" data-testid="close-warnings">
            {warnings.map((warning) => (
              <li key={warning.code + warning.message} className="flex items-start gap-1.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning,#b45309)]" />
                {warning.message}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2">
          <Label htmlFor="close-period-notes">Nota del cierre (opcional)</Label>
          <Textarea id="close-period-notes" rows={2} maxLength={500} {...register('notes')} />
          {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={blockers.length > 0} data-testid="close-period-review">
            <Lock className="size-4" />
            Revisar y cerrar
          </Button>
        </DialogFooter>
      </form>
    );
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent expandable className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cerrar {formatPeriodEs(period)}</DialogTitle>
            <DialogDescription>Revisa los números del mes. Todavía no se cierra nada hasta que lo confirmes.</DialogDescription>
          </DialogHeader>
          {renderBody()}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingNotes !== null}
        onOpenChange={(open) => !open && setPendingNotes(null)}
        title={`¿Cerrar ${formatPeriodEs(period)}?`}
        description={`Los números de ${monthName} quedan fijos: ya no se podrán registrar ni editar movimientos con fecha de ${monthName}. Si luego se corrige algo de ${monthName}, la diferencia se registrará como un ajuste en el mes abierto, con su motivo. Un administrador puede reabrir el mes si hace falta.`}
        confirmLabel="Sí, cerrar el mes"
        variant="default"
        onConfirm={confirmClose}
      />
    </>
  );
}
