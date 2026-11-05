import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { EMPTY_INVOICE_ANSWER, InvoiceQuestion, type InvoiceAnswer } from '@/modules/invoices/components/InvoiceQuestion';
import { useUploadInvoiceFile } from '@/modules/invoices/hooks/useInvoices';
import { useChangeQuotationStatusAny } from '@/modules/quotations/hooks/useQuotations';
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

export interface FinishQuotationTarget {
  id: number;
  clientName?: string;
}

interface FinishQuotationDialogProps {
  quotation: FinishQuotationTarget | null;
  onClose: () => void;
}

// Cerrar una cotización (pasarla a Finalizada) pregunta si se emitió factura
// (pedido explícito del usuario). Con "Sí" queda registrada; la foto o el PDF
// se puede adjuntar ahora o después (queda en Facturas → "Faltan subir").
export function FinishQuotationDialog({ quotation, onClose }: FinishQuotationDialogProps) {
  const [invoice, setInvoice] = useState<InvoiceAnswer>(EMPTY_INVOICE_ANSWER);
  const [error, setError] = useState<string | undefined>(undefined);
  const { mutate: changeStatus, isPending } = useChangeQuotationStatusAny();
  const { mutate: uploadInvoice, isPending: isUploading } = useUploadInvoiceFile();

  useEffect(() => {
    if (quotation) return;
    setInvoice(EMPTY_INVOICE_ANSWER);
    setError(undefined);
  }, [quotation]);

  const confirm = () => {
    if (!quotation) return;
    if (invoice.hasInvoice === null) {
      setError('Indica si se emitió factura');
      return;
    }
    const file = invoice.hasInvoice ? invoice.file : null;
    changeStatus(
      { id: quotation.id, status: 'finished', invoiceIssued: invoice.hasInvoice },
      {
        onSuccess: (result) => {
          onClose();
          if (!result.invoice_id || !file) {
            toast.success(
              invoice.hasInvoice ? 'Cotización finalizada. Falta subir la factura (Facturas → "Faltan subir").' : 'Cotización finalizada',
            );
            return;
          }
          uploadInvoice(
            { invoiceId: result.invoice_id, file },
            {
              onSuccess: () => toast.success('Cotización finalizada con su factura'),
              onError: (uploadError) =>
                toast.error(`Cotización finalizada, pero la factura no se subió: ${(uploadError as ApiClientError).message}`),
            },
          );
        },
        onError: (changeError) => toast.error((changeError as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={quotation !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar COT-{String(quotation?.id ?? 0).padStart(4, '0')}</DialogTitle>
          <DialogDescription>{quotation?.clientName ? `Cliente: ${quotation.clientName}` : 'Cierre de la cotización'}</DialogDescription>
        </DialogHeader>
        <InvoiceQuestion
          question="¿Emitimos factura?"
          value={invoice}
          onChange={(next) => {
            setInvoice(next);
            setError(undefined);
          }}
          error={error}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirm} disabled={isPending || isUploading}>
            <Check className="size-4" />
            {isPending || isUploading ? 'Guardando…' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
