import { Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { InvoiceDetailsFields } from '@/modules/invoices/components/InvoiceDetailsFields';
import {
  invoiceDetailsDto,
  invoiceDetailsError,
  type InvoiceDetailsValue,
} from '@/modules/invoices/utils/invoiceDetails';
import { useLinkPurchases, usePendingPurchases, useRemoveInvoicePurchase, useUpdateInvoiceDetails } from '@/modules/invoices/hooks/useInvoices';
import { INVOICE_DUPLICATE_CODE, type Invoice, type InvoicePurchaseLine } from '@/modules/invoices/types/invoice.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import { useDebouncedValue } from '@/presentation/hooks/shared/useDebouncedValue';

interface InvoicePurchasesDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
}

const detailsOf = (invoice: Invoice): InvoiceDetailsValue => ({
  supplierId: invoice.supplier_id,
  seriesNumber: invoice.series_number ?? '',
  issueDate: invoice.issue_date ?? '',
  currency: invoice.currency,
  total: invoice.total === null ? '' : String(invoice.total),
});

const invoiceName = (invoice: Invoice) => (invoice.series_number ? `la factura ${invoice.series_number}` : `la factura #${invoice.id}`);

// Compras con la factura pendiente que se pueden sumar a esta factura.
function AddPurchasesPanel({ invoice, onDone }: { invoice: Invoice; onDone: () => void }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [chosen, setChosen] = useState<number[]>([]);
  const { data, isFetching } = usePendingPurchases({ page: 1, limit: 20, companyId: invoice.company_id, search: debouncedSearch || undefined });
  const { mutate: link, isPending } = useLinkPurchases();

  const add = () =>
    link(
      { purchase_ids: chosen, invoice_id: invoice.id },
      {
        onSuccess: () => {
          toast.success(chosen.length > 1 ? `${chosen.length} compras agregadas` : 'Compra agregada');
          onDone();
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );

  return (
    <div className="space-y-2 rounded-md border bg-muted/40 p-2" data-testid="invoice-add-purchases">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-8 pl-9" placeholder="Buscar compra sin factura..." value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <ul className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto text-xs">
        {(data?.data ?? []).map((row) => (
          <li key={row.purchase_id}>
            <label className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
              <Checkbox
                checked={chosen.includes(row.purchase_id)}
                onCheckedChange={(checked) =>
                  setChosen((current) => (checked === true ? [...current, row.purchase_id] : current.filter((id) => id !== row.purchase_id)))
                }
              />
              <span className="flex-1 truncate">
                {row.quotation_code} · {row.product_name} × {row.quantity}
              </span>
              <span className="tabular-nums">{formatMoney(row.amount)}</span>
            </label>
          </li>
        ))}
        {!isFetching && (data?.data ?? []).length === 0 && <li className="text-muted-foreground">No hay compras sin factura</li>}
      </ul>
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={chosen.length === 0 || isPending} onClick={add}>
          Agregar {chosen.length > 0 ? `(${chosen.length})` : ''}
        </Button>
      </div>
    </div>
  );
}

/**
 * Detalle de una factura de compra (Sprint 2, ítem 3): sus datos (proveedor,
 * serie-número, fecha, moneda y total), sus compras con "Quitar compra" y
 * "Agregar compras". Nada de esto pide motivo: no mueve dinero.
 */
export function InvoicePurchasesDialog({ invoice, onClose }: InvoicePurchasesDialogProps) {
  if (!invoice) return null;
  // key: otra factura arranca con sus propios datos; un refresco de la misma
  // (al quitar o agregar compras) no borra lo que se está escribiendo.
  return <InvoicePurchasesContent key={invoice.id} invoice={invoice} onClose={onClose} />;
}

function InvoicePurchasesContent({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const canEditDetails = usePermissionButton('invoice.details.button');
  const canRemove = usePermissionButton('invoice.removePurchase.button');
  const canAdd = usePermissionButton('invoice.link.button');
  const [details, setDetails] = useState<InvoiceDetailsValue>(() => detailsOf(invoice));
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<InvoicePurchaseLine | null>(null);
  const [duplicateConfirm, setDuplicateConfirm] = useState(false);
  const { mutate: saveDetails, isPending: isSaving } = useUpdateInvoiceDetails();
  const { mutate: removePurchase } = useRemoveInvoicePurchase();

  const save = (allowDuplicate = false) => {
    const detailsError = invoiceDetailsError(details);
    if (detailsError) {
      setError(detailsError);
      return;
    }
    saveDetails(
      { invoiceId: invoice.id, dto: { ...invoiceDetailsDto(details), allow_duplicate: allowDuplicate || undefined } },
      {
        onSuccess: () => toast.success('Datos de la factura guardados'),
        onError: (failure) => {
          const apiError = failure as ApiClientError;
          if (apiError.code === INVOICE_DUPLICATE_CODE) {
            setDuplicateConfirm(true);
            return;
          }
          toast.error(apiError.message);
        },
      },
    );
  };

  const confirmRemove = () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    removePurchase(
      { invoiceId: invoice.id, purchaseId: target.purchase_id },
      {
        onSuccess: (result) => {
          toast.success(result.invoice_deleted ? 'Compra quitada; la factura quedó sin compras y se eliminó' : 'Compra quitada: vuelve a "Compras sin factura"');
          if (result.invoice_deleted) onClose();
        },
        onError: (failure) => toast.error((failure as ApiClientError).message),
      },
    );
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg" data-testid="invoice-purchases-dialog">
          <DialogHeader>
            <DialogTitle>Factura de compra {invoice.series_number ?? `#${invoice.id}`}</DialogTitle>
            <DialogDescription>
              {invoice.quotation_codes.join(', ')} · {formatMoney(invoice.purchases_total)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1">
            <Label className="text-xs">Compras que cubre</Label>
            <ul className="space-y-1 rounded-md border bg-muted/30 p-2 text-xs">
              {invoice.purchases.map((line) => (
                <li key={line.purchase_id} className="flex items-center gap-2">
                  <span className="flex-1 truncate">
                    {line.quotation_code} · {line.product_name} × {line.quantity}
                  </span>
                  <span className="tabular-nums">{formatMoney(line.amount)}</span>
                  {canRemove && (
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      title="Quitar compra"
                      aria-label={`Quitar ${line.product_name}`}
                      onClick={() => setRemoving(line)}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {invoice.purchases.length === 0 && <li className="text-muted-foreground">Sin compras vigentes</li>}
            </ul>
            {canAdd && !adding && (
              <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
                <Plus className="size-4" />
                Agregar compras
              </Button>
            )}
            {canAdd && adding && <AddPurchasesPanel invoice={invoice} onDone={() => setAdding(false)} />}
          </div>

          {canEditDetails && (
            <div className="space-y-2">
              <Label className="text-xs">Datos de la factura</Label>
              <InvoiceDetailsFields
                value={details}
                companyId={invoice.company_id}
                supplierLabel={invoice.supplier_name}
                idPrefix="invoice-edit-"
                onChange={(next) => {
                  setDetails(next);
                  setError(null);
                }}
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cerrar
            </Button>
            {canEditDetails && (
              <Button type="button" onClick={() => save()} disabled={isSaving}>
                {isSaving ? 'Guardando…' : 'Guardar datos'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Quitar la compra?"
        description={`La compra sale de ${invoiceName(invoice)} y vuelve a "Compras sin factura". Si la factura se queda sin compras y no tiene archivo, se elimina.`}
        confirmLabel="Quitar compra"
        variant="destructive"
        onConfirm={confirmRemove}
      />
      <ConfirmDialog
        open={duplicateConfirm}
        onOpenChange={setDuplicateConfirm}
        title="¿Factura repetida?"
        description="Ya hay otra factura con ese número de este proveedor. Guárdala solo si de verdad es otro documento."
        confirmLabel="Sí, guardar"
        onConfirm={() => {
          setDuplicateConfirm(false);
          save(true);
        }}
      />
    </>
  );
}
