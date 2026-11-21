import type { ApiClientError } from '@/config/api.types';
import { usePreviewQuotationPdf } from '@/modules/quotations/hooks/useQuotations';
import { PdfPreviewDialog } from '@/presentation/components/shared/PdfPreviewDialog';

interface QuotationPdfPreviewDialogProps {
  quotationId: number | null;
  onClose: () => void;
}

// Antes "Descargar PDF" bajaba el archivo directo sin que la persona viera
// nada primero — pedido explícito: primero una vista previa (embebida acá
// mismo, generada una sola vez), y desde ahí, si quiere, recién descarga.
// El diálogo en sí es el genérico PdfPreviewDialog (21-nov).
export function QuotationPdfPreviewDialog({ quotationId, onClose }: QuotationPdfPreviewDialogProps) {
  const { data: blob, isLoading, isError, error } = usePreviewQuotationPdf(quotationId);
  return (
    <PdfPreviewDialog
      open={quotationId !== null}
      onClose={onClose}
      title={`Vista previa — Cotización #${quotationId ?? ''}`}
      blob={blob}
      isLoading={isLoading}
      isError={isError}
      errorMessage={(error as ApiClientError | null)?.message}
      fileName={`cotizacion-${String(quotationId ?? 0).padStart(4, '0')}.pdf`}
    />
  );
}
