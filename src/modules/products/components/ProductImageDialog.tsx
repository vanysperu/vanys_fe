import type { Product } from '@/modules/products/types/product.types';
import { buildAssetUrl } from '@/lib/utils';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';

interface ProductImageDialogProps {
  product: Product | null;
  onClose: () => void;
}

// Al hacer clic en un producto con foto (solo empresas con fotos habilitadas,
// pedido explícito del usuario) se ve la foto en grande, con sus colores.
export function ProductImageDialog({ product, onClose }: ProductImageDialogProps) {
  const imageUrl = buildAssetUrl(product?.image_path);

  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>
            {[product?.sku, product?.category?.name, product?.subcategory?.name].filter(Boolean).join(' · ') || 'Sin categoría'}
          </DialogDescription>
        </DialogHeader>
        {imageUrl && (
          <div className="flex justify-center rounded-lg border bg-muted/30 p-2">
            <img src={imageUrl} alt={product?.name ?? 'Producto'} className="max-h-[60vh] w-auto object-contain" data-testid="product-image-full" />
          </div>
        )}
        {product?.codes && product.codes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Códigos de proveedores:{' '}
            {product.codes.map((entry) => (entry.supplier ? `${entry.code} (${entry.supplier})` : entry.code)).join(', ')}
          </p>
        )}
        {product?.colors && product.colors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.colors.map((color) => (
              <Badge key={color.name} variant="outline" className="gap-1.5">
                {color.hex && <span className="size-3 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden />}
                {color.name}
              </Badge>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
