import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';
import { Ban, HandCoins, Pencil, ReceiptText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import {
  employeeDebtCorrectionsUrl,
  employeeDebtPaymentCorrectionsUrl,
} from '@/modules/employeeDebts/api/employeeDebts.api';
import { CorrectManualDebtDialog } from '@/modules/employeeDebts/components/CorrectManualDebtDialog';
import { CorrectReimbursementDialog } from '@/modules/employeeDebts/components/CorrectReimbursementDialog';
import { CorrectedBadge } from '@/modules/moneyCorrections/components/CorrectedBadge';
import { CorrectionHistoryDialog } from '@/modules/moneyCorrections/components/CorrectionHistoryDialog';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import {
  useCancelManualEmployeeDebt,
  useEmployeeDebtDetail,
  useEmployeeDebtPayments,
  useVoidEmployeeDebtPayment,
} from '@/modules/employeeDebts/hooks/useEmployeeDebts';
import {
  EMPLOYEE_DEBT_ROW_STATUS_LABEL,
  type EmployeeDebtDetailItem,
  type EmployeeDebtPaymentItem,
  type EmployeeDebtSummaryItem,
} from '@/modules/employeeDebts/types/employeeDebt.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { DataTable } from '@/presentation/components/shared/DataTable';
import { Pagination } from '@/presentation/components/shared/Pagination';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateUtils';

const PAGE_SIZE = 10;

function money(amount: number) {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Montos en una sola línea: en columnas angostas "S/" quedaba arriba del número.
function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={cn('whitespace-nowrap', className)}>{money(amount)}</span>;
}

const STATUS_BADGE: Record<EmployeeDebtDetailItem['status'], 'secondary' | 'success' | 'outline'> = {
  pending: 'secondary',
  paid: 'success',
  cancelled: 'outline',
};

// Detalle de lo que se le debe a un trabajador: cada deuda (compra de orden o
// manual) y cada reposición. Acá se corrigen los errores (solo admin):
//   - Corregir (lápiz): una deuda manual o una reposición se corrige en el
//     lugar, con motivo e historial inmutable ("Corregido (n)"). Las deudas
//     de compras se corrigen desde la compra.
//   - Anular: una reposición mal registrada se anula y sus deudas vuelven a
//     pendiente; una deuda manual se anula solo si todavía no se le repuso nada.
export function EmployeeDebtDetailDialog({ debt, onClose }: { debt: EmployeeDebtSummaryItem; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Deudas con {debt.employee_name}</DialogTitle>
          <DialogDescription>
            Pendiente de reponer: {money(debt.pending_amount)} · Ya repuesto: {money(debt.paid_amount)}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="debts">
          <TabsList>
            <TabsTrigger value="debts">Deudas</TabsTrigger>
            <TabsTrigger value="payments">Reposiciones</TabsTrigger>
          </TabsList>
          <TabsContent value="debts">
            <DebtsTab userId={debt.user_id} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab userId={debt.user_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DebtsTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<EmployeeDebtDetailItem | null>(null);
  const [correctingId, setCorrectingId] = useState<number | null>(null);
  const [historyOf, setHistoryOf] = useState<EmployeeDebtDetailItem | null>(null);
  const canCancel = usePermissionButton('employee_debt.disable.button');
  const canCorrect = usePermissionButton('employee_debt.update.button');
  const canSeeHistory = usePermissionButton('employee_debt.corrections.button');
  const { data, isLoading } = useEmployeeDebtDetail({ userId, page, limit: PAGE_SIZE, status: 'all' });
  const { mutateAsync: cancelDebt } = useCancelManualEmployeeDebt();

  // Solo una deuda manual sin nada repuesto (el backend lo revalida).
  const isCancellable = (row: EmployeeDebtDetailItem) =>
    canCancel && row.origin === 'manual' && row.status === 'pending' && row.paid_amount === 0;
  // Las deudas de compras se corrigen desde la compra (el backend responde
  // DEBT_FROM_PURCHASE); una anulada no se corrige.
  const isCorrectable = (row: EmployeeDebtDetailItem) => canCorrect && row.origin === 'manual' && row.status !== 'cancelled';

  return (
    <div className="space-y-3">
      <DataTable<EmployeeDebtDetailItem>
        columns={[
          { header: 'Fecha', cell: (row) => formatDate(row.incurred_at) },
          {
            header: 'Detalle',
            className: 'min-w-56',
            cell: (row) => (
              <div>
                <span>{row.description}</span>
                <CorrectedBadge count={row.corrections_count} canOpen={canSeeHistory} onOpen={() => setHistoryOf(row)} />
                <span className="block text-[10px] text-muted-foreground">
                  {row.origin === 'manual' ? 'Deuda manual' : 'Compra de orden'}
                  {row.purchase_order_id && ` · OC-${String(row.purchase_order_id).padStart(4, '0')}`}
                  {row.quotation_id && ` · COT-${String(row.quotation_id).padStart(4, '0')}`}
                  {row.registered_by_name && ` · registró ${row.registered_by_name}`}
                </span>
              </div>
            ),
          },
          { header: 'Monto', align: 'right', cell: (row) => <Money amount={row.amount} /> },
          { header: 'Repuesto', align: 'right', cell: (row) => <Money amount={row.paid_amount} /> },
          {
            header: 'Pendiente',
            align: 'right',
            cell: (row) => (
              <Money
                amount={row.pending_amount}
                className={row.pending_amount > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}
              />
            ),
          },
          {
            header: 'Estado',
            cell: (row) => <Badge variant={STATUS_BADGE[row.status]}>{EMPLOYEE_DEBT_ROW_STATUS_LABEL[row.status]}</Badge>,
          },
          {
            header: '',
            align: 'right',
            // Orden de acciones del proyecto: editar → anular.
            cell: (row) => (
              <div className="flex justify-end gap-1">
                {isCorrectable(row) && (
                  <Button
                    size="icon"
                    variant="ghost"
                    title="Corregir deuda"
                    aria-label="Corregir deuda"
                    onClick={() => setCorrectingId(row.id)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
                {isCancellable(row) && (
                  <Button size="icon" variant="ghost" title="Anular deuda" aria-label="Anular deuda" onClick={() => setCancelling(row)}>
                    <Ban className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={ReceiptText}
        emptyTitle="Sin deudas registradas"
      />
      {data && data.meta.totalPages > 1 && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
        />
      )}

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
        title="¿Anular esta deuda?"
        description={`"${cancelling?.description ?? ''}" por ${money(cancelling?.amount ?? 0)} dejará de figurar como deuda con el trabajador. Úsalo solo si se registró por error; queda registrado quién la anuló.`}
        confirmLabel="Anular deuda"
        variant="destructive"
        onConfirm={async () => {
          if (!cancelling) return;
          try {
            await cancelDebt(cancelling.id);
            toast.success('Deuda anulada');
          } catch (error) {
            toast.error((error as ApiClientError).message);
          } finally {
            setCancelling(null);
          }
        }}
      />

      {correctingId !== null && <CorrectManualDebtDialog debtId={correctingId} onClose={() => setCorrectingId(null)} />}
      {historyOf && (
        <CorrectionHistoryDialog
          title={`Deuda: ${historyOf.description} (${money(historyOf.amount)})`}
          historyUrl={employeeDebtCorrectionsUrl(historyOf.id)}
          queryKey={moneyCorrectionsKeys.history('employee_debt', historyOf.id)}
          onClose={() => setHistoryOf(null)}
        />
      )}
    </div>
  );
}

function PaymentsTab({ userId }: { userId: number }) {
  const [page, setPage] = useState(1);
  const [voiding, setVoiding] = useState<EmployeeDebtPaymentItem | null>(null);
  const [correctingId, setCorrectingId] = useState<number | null>(null);
  const [historyOf, setHistoryOf] = useState<EmployeeDebtPaymentItem | null>(null);
  const canVoid = usePermissionButton('employee_debt.payment.disable.button');
  const canCorrect = usePermissionButton('employee_debt.payment.update.button');
  const canSeeHistory = usePermissionButton('employee_debt.payment.corrections.button');
  const { data, isLoading } = useEmployeeDebtPayments({ userId, page, limit: PAGE_SIZE });
  const { mutateAsync: voidPayment } = useVoidEmployeeDebtPayment();
  // Anular una reposición de un mes cerrado se registra como ajuste y pide motivo.
  // actionsLocked: reposición de un mes cerrado sin permiso de ajustar → sin acciones.
  const { status: periodStatus, actionsLocked } = useClosedPeriodGuard(undefined, undefined);
  const adjustmentReason = useAdjustmentReason<EmployeeDebtPaymentItem>({
    run: (payment, reason) => voidPayment({ id: payment.id, reason }),
    successMessage: () => 'Reposición anulada como ajuste de un mes cerrado',
    fallbackErrorMessage: 'No se pudo anular la reposición',
  });
  const requestVoid = (payment: EmployeeDebtPaymentItem) => {
    const closedLabel = closedPeriodLabelOf(periodStatus, payment.paid_at);
    if (closedLabel) {
      adjustmentReason.open(payment, 'annul', closedLabel);
      return;
    }
    setVoiding(payment);
  };

  return (
    <div className="space-y-3">
      <DataTable<EmployeeDebtPaymentItem>
        columns={[
          { header: 'Fecha', cell: (row) => formatDate(row.paid_at) },
          {
            header: 'Monto',
            align: 'right',
            cell: (row) => (
              <span className="whitespace-nowrap">
                <Money amount={row.amount} className={row.is_deleted ? 'text-muted-foreground line-through' : 'font-semibold'} />
                <CorrectedBadge count={row.corrections_count} canOpen={canSeeHistory} onOpen={() => setHistoryOf(row)} />
              </span>
            ),
          },
          { header: 'Desde', cell: (row) => row.payment_account_name ?? 'Efectivo' },
          { header: 'Registró', cell: (row) => row.registered_by_name ?? '—' },
          {
            header: 'Estado',
            cell: (row) =>
              row.is_deleted ? <Badge variant="outline">Anulada</Badge> : <Badge variant="success">Vigente</Badge>,
          },
          {
            header: '',
            align: 'right',
            // Orden de acciones del proyecto: editar → anular. Una reposición
            // anulada ya no se corrige (se registra una nueva).
            cell: (row) =>
              row.is_deleted || actionsLocked(row.paid_at) ? null : (
                <div className="flex justify-end gap-1">
                  {canCorrect && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Corregir reposición"
                      aria-label="Corregir reposición"
                      onClick={() => setCorrectingId(row.id)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  {canVoid && (
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Anular reposición"
                      aria-label="Anular reposición"
                      onClick={() => requestVoid(row)}
                    >
                      <Ban className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ),
          },
        ]}
        rows={data?.data ?? []}
        rowKey={(row) => row.id}
        isLoading={isLoading}
        emptyIcon={HandCoins}
        emptyTitle="Todavía no se le repuso nada"
      />
      {data && data.meta.totalPages > 1 && (
        <Pagination
          result={{ page: data.meta.page, pageSize: data.meta.limit, totalCount: data.meta.total }}
          onPageChange={setPage}
        />
      )}

      {adjustmentReason.dialog}
      <ConfirmDialog
        open={voiding !== null}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="¿Anular esta reposición?"
        description={`La reposición de ${money(voiding?.amount ?? 0)} del ${formatDate(voiding?.paid_at ?? null)} sale de Caja y las compras que cubría vuelven a quedar pendientes de reponer. Úsalo solo si se registró por error; no se puede deshacer.`}
        confirmLabel="Anular reposición"
        variant="destructive"
        onConfirm={async () => {
          if (!voiding) return;
          try {
            await voidPayment({ id: voiding.id });
            toast.success('Reposición anulada');
          } catch (error) {
            if (adjustmentReason.absorbError(error, voiding, 'annul')) return;
            toast.error((error as ApiClientError).message);
          } finally {
            setVoiding(null);
          }
        }}
      />

      {correctingId !== null && (
        <CorrectReimbursementDialog reimbursementId={correctingId} onClose={() => setCorrectingId(null)} />
      )}
      {historyOf && (
        <CorrectionHistoryDialog
          title={`Reposición del ${formatDate(historyOf.paid_at)} (${money(historyOf.amount)})`}
          historyUrl={employeeDebtPaymentCorrectionsUrl(historyOf.id)}
          queryKey={moneyCorrectionsKeys.history('employee_debt_payment', historyOf.id)}
          onClose={() => setHistoryOf(null)}
        />
      )}
    </div>
  );
}
