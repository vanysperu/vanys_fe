import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { usePreviewQuotationPdf } from '@/modules/quotations/hooks/useQuotations';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import type { ApiClientError } from '@/config/api.types';

interface QuotationPdfPreviewDialogProps {
  quotationId: number | null;
  onClose: () => void;
}

// Antes "Descargar PDF" bajaba el archivo directo sin que la persona viera
// nada primero — pedido explícito: primero una vista previa (embebida acá
// mismo, generada una sola vez), y desde ahí, si quiere, recién descarga.
export function QuotationPdfPreviewDialog({ quotationId, onClose }: QuotationPdfPreviewDialogProps) {
  const open = quotationId !== null;
  const { data: blob, isLoading, isError, error } = usePreviewQuotationPdf(quotationId);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  useEffect(() => {
    if (isError) toast.error((error as ApiClientError)?.message ?? 'No se pudo generar el PDF');
  }, [isError, error]);

  const handleDownload = () => {
    if (!blobUrl || !quotationId) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `cotizacion-${String(quotationId).padStart(4, '0')}.pdf`;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-12">
            <DialogTitle>Vista previa — Cotización #{quotationId}</DialogTitle>
            <Button size="sm" disabled={!blobUrl} onClick={handleDownload}>
              <Download className="size-3.5" /> Descargar
            </Button>
          </div>
        </DialogHeader>

        {isLoading && <Skeleton className="h-[70vh] w-full" />}
        {isError && !isLoading && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No se pudo generar la vista previa.
          </p>
        )}
        {blobUrl && <iframe src={blobUrl} title="Vista previa del PDF" className="h-[75vh] w-full rounded-lg border" />}
      </DialogContent>
    </Dialog>
  );
}
