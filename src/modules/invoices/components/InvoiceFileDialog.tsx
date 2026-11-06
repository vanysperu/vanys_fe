import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { InvoicePurchaseList } from '@/modules/invoices/components/InvoicePurchaseList';
import { useInvoiceFile } from '@/modules/invoices/hooks/useInvoices';
import { INVOICE_PDF_TYPE, INVOICE_TYPE_LABEL, type Invoice } from '@/modules/invoices/types/invoice.types';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import type { ApiClientError } from '@/config/api.types';

interface InvoiceFileDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
}

// Visor de la factura en un modal (pedido explícito del usuario: antes se
// abría en otra pestaña). Foto -> imagen; PDF -> visor del navegador. Mismo
// patrón que la vista previa del PDF de cotización.
export function InvoiceFileDialog({ invoice, onClose }: InvoiceFileDialogProps) {
  const { data: blob, isLoading, isError, error } = useInvoiceFile(invoice?.id ?? null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setBlobUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    if (isError) toast.error((error as ApiClientError)?.message ?? 'No se pudo abrir la factura');
  }, [isError, error]);

  const isPdf = (blob?.type ?? invoice?.mime_type) === INVOICE_PDF_TYPE;

  const handleDownload = () => {
    if (!blobUrl || !invoice) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = invoice.file_name ?? `factura-${invoice.id}`;
    link.click();
  };

  return (
    <Dialog open={invoice !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-12">
            <div className="min-w-0 space-y-1">
              <DialogTitle>
                Factura {invoice ? INVOICE_TYPE_LABEL[invoice.type].toLowerCase() : ''} · {invoice?.quotation_codes.join(', ')}
              </DialogTitle>
              {/* Con varias compras, el detalle va abajo (InvoicePurchaseList). */}
              <DialogDescription className="truncate">
                {invoice && invoice.purchases.length > 1 ? `Cubre ${invoice.purchases.length} productos` : invoice?.description}
              </DialogDescription>
            </div>
            <Button size="sm" disabled={!blobUrl} onClick={handleDownload}>
              <Download className="size-3.5" /> Descargar
            </Button>
          </div>
        </DialogHeader>

        {invoice && invoice.purchases.length > 1 && <InvoicePurchaseList invoice={invoice} />}

        {isLoading && <Skeleton className="h-[70vh] w-full" />}
        {isError && !isLoading && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No se pudo abrir la factura.</p>
        )}
        {blobUrl && isPdf && <iframe src={blobUrl} title="Factura" className="h-[75vh] w-full rounded-lg border" />}
        {blobUrl && !isPdf && (
          <div className="flex max-h-[75vh] justify-center overflow-auto rounded-lg border bg-muted/30 p-2">
            <img src={blobUrl} alt={`Factura ${invoice?.quotation_code ?? ''}`} className="h-auto max-w-full object-contain" data-testid="invoice-viewer-image" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
