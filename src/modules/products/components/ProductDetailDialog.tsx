import type { ReactNode } from 'react';

import type { Product, ProductColor } from '@/modules/products/types/product.types';
import { buildAssetUrl } from '@/lib/utils';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Separator } from '@/presentation/components/shared/ui/separator';
import { useAccess } from '@/presentation/hooks/shared/useAccess';

interface ProductDetailDialogProps {
  product: Product | null;
  onClose: () => void;
}

const PRICE_ROWS: { field: 'price_unit' | 'price_hundred' | 'price_half_thousand' | 'price_thousand'; label: string }[] = [
  { field: 'price_unit', label: 'Por unidad' },
  { field: 'price_hundred', label: 'Por ciento' },
  { field: 'price_half_thousand', label: 'Medio millar' },
  { field: 'price_thousand', label: 'Por millar' },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

// Una fila "dato: valor" del resumen.
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

function ColorChip({ color }: { color: ProductColor }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      {color.hex && <span className="size-3 rounded-full border" style={{ backgroundColor: color.hex }} aria-hidden />}
      {color.name}
    </Badge>
  );
}

function ProductDetailContent({ product }: { product: Product }) {
  const { data: access } = useAccess();
  // La foto solo se muestra si la empresa tiene habilitadas las fotos.
  const imageUrl = product.images_enabled ? buildAssetUrl(product.image_path) : null;
  const prices = PRICE_ROWS.flatMap(({ field, label }) => {
    const price = product[field];
    return price == null ? [] : [{ label, value: Number(price) }];
  });
  const colors = product.colors ?? [];
  const codes = product.codes ?? [];

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {imageUrl && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center justify-center rounded-lg border bg-muted/30 p-2 sm:w-56"
            title="Abrir la foto en otra pestaña"
          >
            <img src={imageUrl} alt={product.name} className="max-h-56 w-auto object-contain" data-testid="product-image-full" />
          </a>
        )}
        <dl className="grid flex-1 grid-cols-2 content-start gap-x-4 gap-y-3">
          <Fact label="SKU">
            <span className="font-mono">{product.sku ?? '—'}</span>
          </Fact>
          <Fact label="Estado">
            {product.is_deleted ? <Badge variant="destructive">Inactivo</Badge> : <Badge variant="success">Activo</Badge>}
          </Fact>
          <Fact label="Categoría">{product.category?.name ?? '—'}</Fact>
          <Fact label="Subcategoría">{product.subcategory?.name ?? '—'}</Fact>
          <Fact label="Pedido mínimo">{product.min_order_quantity != null ? `${product.min_order_quantity} u.` : 'Sin mínimo'}</Fact>
          <Fact label="Personalización">{product.requires_customization ? 'Requiere técnica' : 'No requiere'}</Fact>
          {/* Solo el Super Administrador ve productos de varias empresas. */}
          {access?.isSystem && <Fact label="Empresa">{product.company_name ?? '—'}</Fact>}
        </dl>
      </div>

      {product.description && (
        <Section title="Descripción">
          {/* pre-line: la subida masiva puede traer saltos de línea. */}
          <p className="text-sm whitespace-pre-line text-muted-foreground">{product.description}</p>
        </Section>
      )}

      <Separator />

      <Section title="Precios por volumen">
        {prices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin precios cargados.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {prices.map((price) => (
              <div key={price.label} className="rounded-lg bg-muted/50 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{price.label}</dt>
                <dd className="font-mono-nums text-sm font-semibold">S/ {price.value.toFixed(2)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      <Section title="Colores">
        {colors.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin colores cargados.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => (
              <ColorChip key={color.name} color={color} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Códigos de proveedores">
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin códigos cargados.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border text-sm" data-testid="product-detail-codes">
            <div className="grid grid-cols-3 gap-2 bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span>Código</span>
              <span>Color</span>
              <span>Proveedor</span>
            </div>
            {codes.map((entry) => {
              const color = colors.find((item) => item.name === entry.color);
              return (
                <div key={entry.code.toUpperCase()} className="grid grid-cols-3 items-center gap-2 border-t px-3 py-1.5">
                  <span className="min-w-0 font-mono text-xs break-words">{entry.code}</span>
                  <span className="min-w-0">{color ? <ColorChip color={color} /> : '—'}</span>
                  <span className="min-w-0 break-words text-muted-foreground">{entry.supplier ?? '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// Ficha del producto: al hacer clic en su nombre se ve toda su información
// (pedido explícito del usuario), tenga foto o no.
export function ProductDetailDialog({ product, onClose }: ProductDetailDialogProps) {
  return (
    <Dialog open={product !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent expandable className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>Ficha del producto</DialogDescription>
        </DialogHeader>
        {product && <ProductDetailContent product={product} />}
      </DialogContent>
    </Dialog>
  );
}
