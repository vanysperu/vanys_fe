import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { PaymentFormFields } from '@/modules/quotations/components/PaymentFormFields';
import { usePaymentDtoBuilder } from '@/modules/quotations/hooks/usePaymentDtoBuilder';
import { useChangeQuotationStatusAny } from '@/modules/quotations/hooks/useQuotations';
import {
  CASH_PAYMENT_METHOD,
  createQuotationPaymentSchema,
  type CreateQuotationPaymentFormValues,
} from '@/modules/quotations/schemas/quotation.schema';
import type { CreateQuotationPaymentDto } from '@/modules/quotations/types/quotation.types';
import { suggestedAdvance } from '@/modules/quotations/utils/advancePayment';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import type { ApiClientError } from '@/config/api.types';
import { todayLocalDateString } from '@/lib/dateUtils';

export interface AcceptQuotationTarget {
  id: number;
  total: number;
  total_paid: number;
  clientName?: string;
}

function money(n: number) {
  return 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface AcceptQuotationDialogProps {
  // null = cerrado.
  quotation: AcceptQuotationTarget | null;
  onClose: () => void;
}

// Al aceptar una cotización: "¿El cliente pagó adelanto?". Sí -> se acepta y
// se registra el pago en UNA sola operación del backend (si el pago falla,
// la cotización tampoco queda aceptada). No -> se acepta sin pago. Cerrar el
// modal no cambia nada.
export function AcceptQuotationDialog({ quotation, onClose }: AcceptQuotationDialogProps) {
  return (
    <Dialog open={quotation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {/* Se monta de nuevo por cotización: el monto sugerido se recalcula. */}
        {quotation && <AcceptQuotationForm key={quotation.id} quotation={quotation} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AcceptQuotationForm({ quotation, onClose }: { quotation: AcceptQuotationTarget; onClose: () => void }) {
  const { mutate: changeStatus, isPending } = useChangeQuotationStatusAny();
  const form = useForm<CreateQuotationPaymentFormValues>({
    resolver: zodResolver(createQuotationPaymentSchema),
    defaultValues: {
      amount: suggestedAdvance(quotation.total, quotation.total_paid),
      method: CASH_PAYMENT_METHOD,
      paid_at: todayLocalDateString(),
      notes: 'Adelanto',
    },
  });
  const buildPaymentDto = usePaymentDtoBuilder(form);
  const balance = Math.max(quotation.total - quotation.total_paid, 0);

  const accept = (advancePayment?: CreateQuotationPaymentDto) =>
    changeStatus(
      { id: quotation.id, status: 'accepted', advancePayment },
      {
        onSuccess: () => {
          toast.success(advancePayment ? 'Cotización aceptada y adelanto registrado' : 'Cotización marcada como "Aceptada"');
          onClose();
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );

  const onSubmitAdvance = (values: CreateQuotationPaymentFormValues) => {
    const dto = buildPaymentDto(values);
    if (!dto) return;
    accept(dto);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmitAdvance)} className="space-y-3">
      <DialogHeader>
        <DialogTitle>¿El cliente pagó adelanto?</DialogTitle>
        <DialogDescription>
          COT-{String(quotation.id).padStart(4, '0')}
          {quotation.clientName ? ` · ${quotation.clientName}` : ''} · Total {money(quotation.total)}
          {quotation.total_paid > 0 ? ` · Saldo ${money(balance)}` : ''}. Se sugiere la mitad; puedes cambiar el monto.
        </DialogDescription>
      </DialogHeader>

      <PaymentFormFields form={form} idPrefix="advance" />

      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="outline" disabled={isPending} onClick={() => accept()}>
          No, aceptar sin adelanto
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Sí, registrar adelanto
        </Button>
      </DialogFooter>
    </form>
  );
}
