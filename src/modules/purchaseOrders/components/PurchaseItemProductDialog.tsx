import { buildAssetUrl } from '@/lib/utils';
import type { PurchaseOrderItem } from '@/modules/purchaseOrders/types/purchaseOrder.types';
import { QuotationItemVariant } from '@/modules/quotations/components/QuotationItemVariant';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

interface PurchaseItemProductDialogProps {
  item: PurchaseOrderItem | null;
  onClose: () => void;
}

// Lo que necesita ver quien va a comprar el producto de una orden (pedido
// explícito del usuario): color, código y cantidad siempre; la foto solo en
// empresas con fotos habilitadas (el backend no la manda en las demás).
export function PurchaseItemProductDialog({ item, onClose }: PurchaseItemProductDialogProps) {
  const quotationItem = item?.quotationItem;
  const imageUrl = buildAssetUrl(quotationItem?.product?.image_path);
  const imagesEnabled = Boolean(quotationItem?.product?.images_enabled);

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{quotationItem?.product?.name ?? 'Producto'}</DialogTitle>
          <DialogDescription>Cantidad a comprar: {item?.quantity}</DialogDescription>
        </DialogHeader>
        {imageUrl ? (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center rounded-lg border bg-muted/30 p-2"
            title="Abrir la foto en otra pestaña"
          >
            <img
              src={imageUrl}
              alt={quotationItem?.product?.name ?? ''}
              className="max-h-72 w-auto object-contain"
              data-testid="purchase-item-image"
            />
          </a>
        ) : (
          imagesEnabled && (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
              Este producto no tiene foto cargada.
            </p>
          )
        )}
        {quotationItem?.color || quotationItem?.product_code ? (
          <QuotationItemVariant item={quotationItem} />
        ) : (
          <p className="text-xs text-muted-foreground">La cotización no indica un color.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
