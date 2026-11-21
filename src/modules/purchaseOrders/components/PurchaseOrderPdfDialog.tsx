import { useQuery } from '@tanstack/react-query';

import type { ApiClientError } from '@/config/api.types';
import { getPurchaseOrderPdf } from '@/modules/purchaseOrders/api/purchaseOrder.api';
import { purchaseOrderKeys } from '@/modules/purchaseOrders/hooks/purchaseOrder.keys';
import { PdfPreviewDialog } from '@/presentation/components/shared/PdfPreviewDialog';

interface PurchaseOrderPdfDialogProps {
  purchaseOrderId: number | null;
  onClose: () => void;
}

// Vista previa del PDF de una orden de compra (pedido del usuario, 21-nov):
// qué comprar, con la foto y los datos de cada producto. Se genera solo al
// abrirlo y queda en caché hasta que cambie algo de compras.
export function PurchaseOrderPdfDialog({ purchaseOrderId, onClose }: PurchaseOrderPdfDialogProps) {
  const { data: blob, isLoading, isError, error } = useQuery({
    queryKey: purchaseOrderKeys.pdf(purchaseOrderId ?? 0),
    queryFn: () => getPurchaseOrderPdf(purchaseOrderId as number),
    enabled: purchaseOrderId !== null,
    retry: false,
  });
  const code = `OC-${String(purchaseOrderId ?? 0).padStart(4, '0')}`;
  return (
    <PdfPreviewDialog
      open={purchaseOrderId !== null}
      onClose={onClose}
      title={`Orden de compra ${code}`}
      blob={blob}
      isLoading={isLoading}
      isError={isError}
      errorMessage={(error as ApiClientError | null)?.message}
      fileName={`orden-de-compra-${String(purchaseOrderId ?? 0).padStart(4, '0')}.pdf`}
    />
  );
}
