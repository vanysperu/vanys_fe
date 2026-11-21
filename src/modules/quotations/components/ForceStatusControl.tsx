import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { useForceQuotationStatus } from '@/modules/quotations/hooks/useQuotations';
import {
  QUOTATION_STATUS_LABEL,
  QUOTATION_STATUS_ORDER,
  type QuotationStatus,
} from '@/modules/quotations/types/quotation.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

interface ForceStatusControlProps {
  quotationId: number;
  currentStatus: QuotationStatus;
}

// "Cambiar estado" de un administrador (pedido del usuario, 21-nov): mueve la
// cotización a CUALQUIER estado y la puede devolver, sin el paso a paso del
// flujo normal. Se muestra solo con el botón RBAC cotizacion.forceStatus.button
// (lo decide quien lo usa); el backend vuelve a validar permiso, alcance y
// las reglas del dinero (pagos o compras bloquean rechazar/cancelar/vencer/
// volver a Pendiente).
export function ForceStatusControl({ quotationId, currentStatus }: ForceStatusControlProps) {
  const [target, setTarget] = useState<QuotationStatus | null>(null);
  const [note, setNote] = useState('');
  const { mutateAsync: forceStatus } = useForceQuotationStatus(quotationId);
  // "Pendiente de cotizar" no es un destino (es la entrada de un pedido web).
  const options = QUOTATION_STATUS_ORDER.filter((status) => status !== currentStatus && status !== 'quote_requested');

  const handleConfirm = async () => {
    if (!target) return;
    try {
      const result = await forceStatus({ status: target, note: note.trim() || null });
      toast.success(`Estado cambiado a "${QUOTATION_STATUS_LABEL[result.status]}"`);
      result.warnings.forEach((warning) => toast.warning(warning, { duration: 10_000 }));
      setTarget(null);
    } catch (error) {
      toast.error((error as ApiClientError).message);
    }
  };

  return (
    <>
      {/* value vacío: el selector siempre muestra "Cambiar estado"; el estado
          actual ya se ve en la etiqueta de al lado. */}
      <Select
        value=""
        onValueChange={(value) => {
          // Radix puede llamar con "" al montar dentro de un formulario.
          if (!value) return;
          setNote('');
          setTarget(value as QuotationStatus);
        }}
      >
        <SelectTrigger className="h-8 w-auto gap-1 text-xs" aria-label="Cambiar estado">
          <SelectValue placeholder="Cambiar estado" />
        </SelectTrigger>
        <SelectContent>
          {options.map((status) => (
            <SelectItem key={status} value={status}>
              {QUOTATION_STATUS_LABEL[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="¿Cambiar el estado de la cotización?"
        description={
          target
            ? `De "${QUOTATION_STATUS_LABEL[currentStatus]}" a "${QUOTATION_STATUS_LABEL[target]}", sin pasar por el flujo normal. Queda en el historial con tu nombre.`
            : ''
        }
        confirmLabel="Cambiar estado"
        variant="default"
        onConfirm={handleConfirm}
      >
        <div className="space-y-1">
          <Label htmlFor="force-status-note" className="text-xs">
            Motivo (opcional)
          </Label>
          <Textarea
            id="force-status-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Ej.: se marcó como entregada por error"
          />
        </div>
      </ConfirmDialog>
    </>
  );
}
