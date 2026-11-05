import { Ban, Landmark, Pencil, UserRound, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { cn } from '@/lib/utils';
import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';
import { CorrectedBadge } from '@/modules/moneyCorrections/components/CorrectedBadge';
import { CorrectionHistoryDialog } from '@/modules/moneyCorrections/components/CorrectionHistoryDialog';
import { moneyCorrectionsKeys } from '@/modules/moneyCorrections/hooks/moneyCorrections.keys';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { purchaseCorrectionsUrl } from '@/modules/purchaseOrders/api/purchaseOrder.api';
import { CorrectPurchaseDialog } from '@/modules/purchaseOrders/components/CorrectPurchaseDialog';
import { useAnnulPurchase } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import type { PurchaseOrderItemPurchase } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { formatDate } from '@/lib/dateUtils';

interface PurchaseLinesListProps {
  purchases: PurchaseOrderItemPurchase[];
  productName: string;
}

// Compras de un producto de la orden, una por línea (anuladas tachadas), con
// las acciones de corregir/anular (solo administradores) y el badge
// "Corregido (n)" con su historial.
export function PurchaseLinesList({ purchases, productName }: PurchaseLinesListProps) {
  const canCorrect = usePermissionButton('purchase_order.purchase.update.button');
  const canAnnul = usePermissionButton('purchase_order.purchase.disable.button');
  const canOpenHistory = usePermissionButton('purchase_order.purchase.corrections.button');
  const [correctingId, setCorrectingId] = useState<number | null>(null);
  const [annulling, setAnnulling] = useState<PurchaseOrderItemPurchase | null>(null);
  const [history, setHistory] = useState<PurchaseOrderItemPurchase | null>(null);
  const { mutateAsync: annul } = useAnnulPurchase();
  // Anular una compra de un mes cerrado (pagada por la empresa) se registra como ajuste.
  const { status: periodStatus, actionsLocked } = useClosedPeriodGuard(undefined, undefined);
  // Compra de la empresa de un mes cerrado sin permiso de ajustar: sin acciones
  // (la de un trabajador no mueve caja y se sigue corrigiendo/anulando).
  const purchaseLocked = (purchase: PurchaseOrderItemPurchase): boolean =>
    purchase.funding_source === 'company' && actionsLocked(purchase.spent_at);
  const adjustmentReason = useAdjustmentReason<PurchaseOrderItemPurchase>({
    run: (purchase, reason) => annul({ id: purchase.id, reason }),
    successMessage: () => 'Compra anulada como ajuste de un mes cerrado',
    fallbackErrorMessage: 'No se pudo anular la compra',
  });
  const requestAnnul = (purchase: PurchaseOrderItemPurchase) => {
    // Una compra pagada por un trabajador no mueve caja: no genera ajuste.
    const closedLabel = purchase.funding_source === 'company' ? closedPeriodLabelOf(periodStatus, purchase.spent_at) : null;
    if (closedLabel) {
      adjustmentReason.open(purchase, 'annul', closedLabel);
      return;
    }
    setAnnulling(purchase);
  };

  const confirmAnnul = async () => {
    if (!annulling) return;
    // try/catch solo para cerrar la confirmación y avisar.
    try {
      await annul({ id: annulling.id });
      toast.success('Compra anulada');
    } catch (mutationError) {
      if (adjustmentReason.absorbError(mutationError, annulling, 'annul')) return;
      toast.error((mutationError as ApiClientError).message ?? 'No se pudo anular la compra');
    } finally {
      setAnnulling(null);
    }
  };

  return (
    <>
      {/* Altura máxima con scroll: un producto con muchas compras no estira la fila. */}
      <ul
        className="scrollbar-thin max-h-56 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/30 p-1.5 text-xs"
        data-testid="purchase-lines"
      >
        {purchases.map((purchase) => (
          <li
            key={purchase.id}
            className={cn(
              'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-md border bg-card px-2 py-1.5 shadow-xs',
              purchase.is_deleted && 'border-dashed bg-transparent shadow-none',
            )}
          >
            <span className={cn('flex min-w-0 flex-col', purchase.is_deleted && 'text-muted-foreground line-through')}>
              <span className="text-sm font-semibold tabular-nums">{formatMoney(Number(purchase.amount))}</span>
              <span className="text-[11px] text-muted-foreground">
                {formatDate(purchase.spent_at)} · {purchase.quantity} u.
              </span>
            </span>
            <FundingBadge purchase={purchase} />
            {purchase.is_deleted && <Badge variant="destructive">Anulada</Badge>}
            <CorrectedBadge count={purchase.corrections_count} canOpen={canOpenHistory} onOpen={() => setHistory(purchase)} />
            {!purchase.is_deleted && (canCorrect || canAnnul) && !purchaseLocked(purchase) && (
              <span className="ml-auto flex shrink-0 items-center">
                {canCorrect && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Corregir compra"
                    aria-label="Corregir compra"
                    onClick={() => setCorrectingId(purchase.id)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
                {canAnnul && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Anular compra"
                    aria-label="Anular compra"
                    onClick={() => requestAnnul(purchase)}
                  >
                    <Ban className="size-3.5 text-destructive" />
                  </Button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>

      {correctingId !== null && <CorrectPurchaseDialog purchaseId={correctingId} onClose={() => setCorrectingId(null)} />}
      {history && (
        <CorrectionHistoryDialog
          title={`Compra de ${productName}`}
          historyUrl={purchaseCorrectionsUrl(history.id)}
          queryKey={moneyCorrectionsKeys.history('quotation_expense', history.quotation_expense_id)}
          onClose={() => setHistory(null)}
        />
      )}
      {adjustmentReason.dialog}
      <ConfirmDialog
        open={annulling !== null}
        onOpenChange={(open) => !open && setAnnulling(null)}
        title="¿Anular esta compra?"
        description={
          annulling
            ? `${annulling.quantity} u. por ${formatMoney(Number(annulling.amount))}. Deja de contar como comprada y su gasto sale de Caja y Estadísticas${annulling.funding_source === 'employee' ? '; la deuda con el trabajador se anula' : ''}. No se puede deshacer: si hacía falta, regístrala de nuevo.`
            : ''
        }
        confirmLabel="Sí, anular"
        variant="destructive"
        onConfirm={confirmAnnul}
      />
    </>
  );
}

// De dónde salió el dinero de la compra: la empresa (cuenta o efectivo) o un
// trabajador con su plata (eso genera una deuda a reponerle).
function FundingBadge({ purchase }: { purchase: PurchaseOrderItemPurchase }) {
  if (purchase.funding_source === 'employee') {
    const worker = purchase.paid_by_user_name ?? 'un trabajador';
    return (
      <Badge variant="warning" className="max-w-full" title={`Pagó ${worker} con su plata`}>
        <UserRound className="size-3 shrink-0" />
        <span className="truncate">Pagó {worker}</span>
      </Badge>
    );
  }

  const account = purchase.payment_account_name;
  const AccountIcon = account ? Landmark : Wallet;
  return (
    <Badge variant="default" className="max-w-full" title={account ?? 'Efectivo'}>
      <AccountIcon className="size-3 shrink-0" />
      <span className="truncate">{account ?? 'Efectivo'}</span>
    </Badge>
  );
}
