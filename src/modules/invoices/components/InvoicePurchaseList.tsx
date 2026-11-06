import type { Invoice } from '@/modules/invoices/types/invoice.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';

interface InvoicePurchaseListProps {
  invoice: Invoice;
}

// Productos que cubre una factura de compra, con su total: para comparar con
// el papel de un vistazo (una factura puede cubrir varios productos).
export function InvoicePurchaseList({ invoice }: InvoicePurchaseListProps) {
  return (
    <div className="rounded-lg border p-3 text-sm" data-testid="invoice-purchase-list">
      <ul className="divide-y">
        {invoice.purchases.map((line) => (
          <li key={line.purchase_id} className="flex items-center justify-between gap-3 py-1.5">
            <span className="min-w-0">
              {line.product_name} × {line.quantity}
              <span className="block text-xs text-muted-foreground">{line.quotation_code}</span>
            </span>
            <span className="shrink-0 font-mono-nums">{formatMoney(line.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-center justify-between gap-3 border-t pt-2 font-semibold">
        <span>Total de las compras</span>
        <span className="font-mono-nums">{formatMoney(invoice.purchases_total)}</span>
      </p>
    </div>
  );
}
