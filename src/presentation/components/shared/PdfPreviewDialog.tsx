import { Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { downloadBlob } from '@/lib/downloadBlob';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';

interface PdfPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  // El PDF ya generado (lo pide cada módulo con su propio hook).
  blob: Blob | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  fileName: string;
}

// Vista previa de un PDF generado por el sistema, embebida en un diálogo, con
// "Descargar" (pedido explícito: primero se ve, después se baja). Genérico:
// lo usan la cotización y la orden de compra (21-nov), cada una con su hook.
export function PdfPreviewDialog({ open, onClose, title, blob, isLoading, isError, errorMessage, fileName }: PdfPreviewDialogProps) {
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
    if (isError) toast.error(errorMessage ?? 'No se pudo generar el PDF');
  }, [isError, errorMessage]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent expandable className="sm:max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-12">
            <DialogTitle>{title}</DialogTitle>
            <Button size="sm" disabled={!blob} onClick={() => blob && downloadBlob(blob, fileName)}>
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
