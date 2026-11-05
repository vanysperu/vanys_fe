import type { ProductColor } from '@/modules/products/types/product.types';

interface QuotationItemVariantProps {
  item: {
    color?: string | null;
    product_code?: string | null;
    product?: { colors?: ProductColor[] };
  };
}

// Color y código de proveedor de un item. El código solo se ve dentro del
// sistema: al cliente (PDF) le llega únicamente el color.
export function QuotationItemVariant({ item }: QuotationItemVariantProps) {
  if (!item.color && !item.product_code) return null;

  const hex = item.product?.colors?.find((color) => color.name === item.color)?.hex;

  return (
    <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground" data-testid="quotation-item-variant">
      {item.color && (
        <span className="inline-flex items-center gap-1">
          {hex && <span className="size-2.5 rounded-full border" style={{ backgroundColor: hex }} aria-hidden />}
          <span className="font-medium text-foreground">{item.color}</span>
        </span>
      )}
      {item.product_code && <span className="font-mono">{item.product_code}</span>}
    </p>
  );
}
