import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useAdjustmentReason } from '@/modules/cashClosings/hooks/useAdjustmentReason';
import { useClosedPeriodGuard } from '@/modules/cashClosings/hooks/useClosedPeriodGuard';
import { closedPeriodLabelOf } from '@/modules/cashClosings/utils/period';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { useAnnulPurchase } from '@/modules/purchaseOrders/hooks/usePurchaseOrders';
import type { FundingSource } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';

// Lo mínimo para anular una compra desde cualquier pantalla que la muestre.
export interface AnnulPurchaseTarget {
  id: number;
  amount: number;
  spent_at: string;
  funding_source: FundingSource;
  // Ej. "10 u." o el nombre del producto.
  label?: string;
}

interface UsePurchaseAnnulmentResult {
  requestAnnul: (purchase: AnnulPurchaseTarget) => void;
  // Compra de la empresa de un mes cerrado sin permiso de ajustar: sin acciones
  // (la de un trabajador no mueve caja y se sigue pudiendo anular).
  isLocked: (purchase: Pick<AnnulPurchaseTarget, 'spent_at' | 'funding_source'>) => boolean;
  dialog: ReactNode;
}

// Anular una compra (pedido explícito del usuario: compras que salieron mal, se
// devolvieron y devolvieron la plata). Es el mismo flujo en la orden de compra,
// en la pestaña Gastos y en Caja: el backend anula compra, gasto y deuda juntos,
// y si es de un mes cerrado queda como ajuste en el mes abierto, con su motivo.
export function usePurchaseAnnulment(companyId?: number): UsePurchaseAnnulmentResult {
  const [annulling, setAnnulling] = useState<AnnulPurchaseTarget | null>(null);
  const { mutateAsync: annul } = useAnnulPurchase();
  const { status: periodStatus, actionsLocked } = useClosedPeriodGuard(companyId, undefined);
  const adjustmentReason = useAdjustmentReason<AnnulPurchaseTarget>({
    run: (purchase, reason) => annul({ id: purchase.id, reason }),
    successMessage: () => 'Compra anulada como ajuste de un mes cerrado',
    fallbackErrorMessage: 'No se pudo anular la compra',
  });

  const requestAnnul = (purchase: AnnulPurchaseTarget) => {
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

  const summary = annulling ? [annulling.label, formatMoney(annulling.amount)].filter(Boolean).join(' · ') : '';
  const debtNote = annulling?.funding_source === 'employee' ? ' La deuda con el trabajador se anula.' : '';

  return {
    requestAnnul,
    isLocked: (purchase) => purchase.funding_source === 'company' && actionsLocked(purchase.spent_at),
    dialog: (
      <>
        {adjustmentReason.dialog}
        <ConfirmDialog
          open={annulling !== null}
          onOpenChange={(open) => !open && setAnnulling(null)}
          title="¿Anular esta compra?"
          description={`${summary}. Úsala si la compra se devolvió o se registró por error: su gasto sale de Caja y Estadísticas y el producto vuelve a quedar pendiente de comprar.${debtNote} Si tenía factura con archivo, se conserva en Facturas. Queda tachada como registro y no se puede deshacer: si hacía falta, regístrala de nuevo.`}
          confirmLabel="Sí, anular"
          variant="destructive"
          onConfirm={confirmAnnul}
        />
      </>
    ),
  };
}
