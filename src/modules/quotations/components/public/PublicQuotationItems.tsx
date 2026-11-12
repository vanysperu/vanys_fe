import { formatSoles } from '@/lib/money';
import type { PublicQuotationView } from '@/modules/quotations/types/share.types';

interface PublicQuotationItemsProps {
  items: PublicQuotationView['items'];
  includesIgv: boolean;
}

const variantOf = (item: PublicQuotationView['items'][number]) =>
  [item.color, item.techniqueName].filter((part): part is string => Boolean(part)).join(' · ');

// Productos de la cotización compartida: tabla en pantallas anchas y tarjetas
// en el celular (donde la tabla partía los nombres y el total quedaba fuera).
export function PublicQuotationItems({ items, includesIgv }: PublicQuotationItemsProps) {
  return (
    <>
      <ul className="divide-y sm:hidden">
        {items.map((item) => (
          <li key={item.id} className="space-y-1 py-3">
            <p className="font-medium">{item.productName}</p>
            {variantOf(item) && <p className="text-xs text-muted-foreground">{variantOf(item)}</p>}
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">
                {item.quantity} × {formatSoles(item.unitPrice)}
              </span>
              <span className="font-semibold tabular-nums">{formatSoles(includesIgv ? item.total : item.subtotal)}</span>
            </div>
          </li>
        ))}
      </ul>

      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground uppercase">
            <th className="py-2 font-medium">Producto</th>
            <th className="py-2 text-right font-medium">Cant.</th>
            <th className="py-2 text-right font-medium">P. unit.</th>
            <th className="py-2 text-right font-medium">{includesIgv ? 'Total' : 'Total (sin IGV)'}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2.5">
                <p className="font-medium">{item.productName}</p>
                {variantOf(item) && <p className="text-xs text-muted-foreground">{variantOf(item)}</p>}
              </td>
              <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2.5 text-right tabular-nums">{formatSoles(item.unitPrice)}</td>
              <td className="py-2.5 text-right font-medium tabular-nums">{formatSoles(includesIgv ? item.total : item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
