import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import type { ApiClientError } from '@/config/api.types';
import { formatPeriodEs } from '@/modules/cashClosings/utils/period';
import { CorrectionReasonField } from '@/modules/moneyCorrections/components/CorrectionReasonField';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { useQuotationResetPreview, useResetQuotation } from '@/modules/quotations/hooks/useQuotations';
import { correctionReasonSchema } from '@/modules/quotations/schemas/quotation.schema';
import type { QuotationResetSummary, ResetMoneyLine } from '@/modules/quotations/types/quotation.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

const resetSchema = z.object({ reason: correctionReasonSchema, confirmation: z.string() });
type ResetFormValues = z.infer<typeof resetSchema>;

interface ResetQuotationDialogProps {
  quotationId: number | null;
  onClose: () => void;
}

const quotationCode = (id: number) => `COT-${String(id).padStart(4, '0')}`;

const moneyRows = (summary: QuotationResetSummary): [string, ResetMoneyLine][] => [
  ['Pagos recibidos', summary.payments],
  ['Gastos', summary.expenses],
  ['Compras', summary.purchases],
  ['Deudas con trabajadores', summary.debts],
  ['Reposiciones a trabajadores', summary.reimbursements],
  ['Movimientos de Caja vinculados', summary.cash_movements],
];

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span>{label}</span>
      <span className="shrink-0 font-mono-nums text-muted-foreground">{value}</span>
    </li>
  );
}

// Lo que se va a borrar, tal como lo calcula el backend (el mismo cálculo que
// usa el reset).
function ResetSummaryList({ summary }: { summary: QuotationResetSummary }) {
  const rows = moneyRows(summary).filter(([, line]) => line.count > 0);
  const isEmpty = rows.length === 0 && summary.purchase_orders === 0 && summary.invoices_deleted === 0;
  if (isEmpty) return <p className="text-sm text-muted-foreground">No tiene pagos, gastos ni compras: solo vuelve a Pendiente.</p>;

  return (
    <ul className="divide-y rounded-lg border px-3" data-testid="reset-summary">
      {rows.map(([label, line]) => (
        <SummaryRow key={label} label={label} value={`${line.count} · ${formatMoney(line.total)}`} />
      ))}
      {summary.purchase_orders > 0 && <SummaryRow label="Órdenes de compra" value={String(summary.purchase_orders)} />}
      {summary.invoices_deleted > 0 && <SummaryRow label="Facturas" value={String(summary.invoices_deleted)} />}
    </ul>
  );
}

// Resetear una cotización (solo Super Administrador, pedido explícito del
// usuario). Es irreversible: primero muestra exactamente qué se borra y pide el
// motivo y escribir el código de la cotización.
export function ResetQuotationDialog({ quotationId, onClose }: ResetQuotationDialogProps) {
  const open = quotationId !== null;
  const { data: preview, isLoading } = useQuotationResetPreview(quotationId, open);
  const { mutateAsync: reset, isPending } = useResetQuotation();
  const code = quotationId === null ? '' : quotationCode(quotationId);

  const {
    register,
    handleSubmit,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<ResetFormValues>({ resolver: zodResolver(resetSchema), defaultValues: { reason: '', confirmation: '' } });

  const close = () => {
    resetForm();
    onClose();
  };

  const onSubmit = async ({ reason }: ResetFormValues) => {
    if (quotationId === null) return;
    // try/catch solo para avisar: si el backend lo rechaza, el diálogo sigue abierto.
    try {
      await reset({ id: quotationId, reason });
      toast.success(`${code} volvió a Pendiente y se borró todo lo que generó`);
      close();
    } catch (error) {
      toast.error((error as ApiClientError).message ?? 'No se pudo resetear la cotización');
    }
  };

  const showsSummary = Boolean(preview?.can_reset) || (preview?.blocked_periods.length ?? 0) > 0;
  const canSubmit = Boolean(preview?.can_reset) && watch('confirmation').trim().toUpperCase() === code && !isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resetear {code} a Pendiente</DialogTitle>
          <DialogDescription>Vuelve a Pendiente y borra físicamente todo lo que generó. No se puede deshacer.</DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-32 w-full" />}

        {preview && (
          <form id="reset-quotation-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Ya en Pendiente y sin nada que borrar: solo se muestra el aviso. */}
            {showsSummary && <ResetSummaryList summary={preview.summary} />}

            {preview.summary.invoices_kept > 0 && (
              <p className="text-xs text-muted-foreground">
                {preview.summary.invoices_kept} factura(s) cubren también compras de otra cotización: se conservan, solo sin estas compras.
              </p>
            )}
            {preview.summary.reimbursements.count > 0 && (
              <p className="text-xs text-muted-foreground">
                Una reposición que también pagó otras deudas se conserva, solo sin la parte de esta cotización.
              </p>
            )}
            {preview.can_reset && (
              <p className="text-xs text-muted-foreground">
                Se conservan el cliente, los productos, los precios y el historial. Lo copiado a Google Drive no se toca.
              </p>
            )}

            {preview.blocked_reason && (
              <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm" data-testid="reset-blocked">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="min-w-0 space-y-1">
                  <p>{preview.blocked_reason}</p>
                  {preview.blocked_periods.length > 0 && (
                    <Link to="/caja/cierres" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                      Ir a Cierres de caja ({preview.blocked_periods.map(formatPeriodEs).join(', ')})
                    </Link>
                  )}
                </div>
              </div>
            )}

            {preview.can_reset && (
              <>
                <CorrectionReasonField
                  id="reset-reason"
                  label="Motivo del reset"
                  registration={register('reason')}
                  error={errors.reason?.message}
                  placeholder="Ej.: cotización de prueba, se registró por error"
                />
                <div className="space-y-1">
                  <Label htmlFor="reset-confirmation">
                    Escribe <span className="font-semibold">{code}</span> para confirmar
                  </Label>
                  <Input id="reset-confirmation" autoComplete="off" {...register('confirmation')} />
                </div>
              </>
            )}
          </form>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={close} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="reset-quotation-form" variant="destructive" disabled={!canSubmit}>
            <RotateCcw className="size-4" />
            {isPending ? 'Reseteando…' : 'Resetear a Pendiente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
