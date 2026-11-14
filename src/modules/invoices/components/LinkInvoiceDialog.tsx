import { FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { InvoiceDetailsFields } from '@/modules/invoices/components/InvoiceDetailsFields';
import {
  EMPTY_INVOICE_DETAILS,
  invoiceDetailsDto,
  invoiceDetailsError,
  type InvoiceDetailsValue,
} from '@/modules/invoices/utils/invoiceDetails';
import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { useInvoices, useLinkPurchases } from '@/modules/invoices/hooks/useInvoices';
import { INVOICE_DUPLICATE_CODE, type Invoice, type LinkPurchasesDto } from '@/modules/invoices/types/invoice.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { SearchableSelect } from '@/presentation/components/shared/SearchableSelect';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { useDebouncedValue } from '@/presentation/hooks/shared/useDebouncedValue';

// Una compra que se va a vincular, tal como se muestra en el resumen.
export interface LinkablePurchase {
  id: number;
  label: string;
  amount: number;
}

interface LinkInvoiceDialogProps {
  purchases: LinkablePurchase[];
  open: boolean;
  onClose: () => void;
  onLinked?: () => void;
  companyId?: number;
  // "Agregar compras" desde una factura: va directo a esa factura.
  fixedInvoice?: { id: number; label: string };
}

type Mode = 'new' | 'existing';

const invoiceLabel = (invoice: Invoice) =>
  [invoice.series_number ?? `#${invoice.id}`, invoice.supplier_name, formatDate(invoice.created_at.date), invoice.description]
    .filter(Boolean)
    .join(' · ');

// Selector de una factura de compra ya registrada (busca por número, proveedor,
// producto o cotización). El backend valida que se le puedan sumar las compras.
function ExistingInvoicePicker({ value, onChange }: { value: number | null; onChange: (id: number) => void }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>(undefined);
  const { data, isFetching } = useInvoices({ page: 1, limit: 20, type: 'purchase', search: debouncedSearch || undefined });
  const options = (data?.data ?? []).map((invoice) => ({
    value: String(invoice.id),
    label: invoiceLabel(invoice),
    hint: invoice.has_file ? 'Con archivo' : 'Falta archivo',
  }));
  return (
    <SearchableSelect
      placeholder="Elige o busca la factura"
      value={value ? String(value) : undefined}
      options={options}
      serverSearch
      onSearchChange={setSearch}
      isSearching={isFetching}
      selectedLabel={selectedLabel}
      emptyText="No hay facturas de compra"
      onChange={(selected) => {
        setSelectedLabel(options.find((option) => option.value === selected)?.label);
        onChange(Number(selected));
      }}
    />
  );
}

/**
 * "Registrar factura" / "Vincular factura" (Sprint 2, ítem 3): UNA factura para
 * una o varias compras, nueva (con sus datos y su archivo en el mismo paso) o
 * una ya registrada. No pide motivo: vincular la factura no mueve dinero.
 */
export function LinkInvoiceDialog({ purchases, open, onClose, onLinked, companyId, fixedInvoice }: LinkInvoiceDialogProps) {
  const [mode, setMode] = useState<Mode>(fixedInvoice ? 'existing' : 'new');
  const [details, setDetails] = useState<InvoiceDetailsValue>(EMPTY_INVOICE_DETAILS);
  const [file, setFile] = useState<File | null>(null);
  const [existingId, setExistingId] = useState<number | null>(fixedInvoice?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<LinkPurchasesDto | null>(null);
  const { mutate: link, isPending } = useLinkPurchases();
  const total = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  const reset = () => {
    setMode(fixedInvoice ? 'existing' : 'new');
    setDetails(EMPTY_INVOICE_DETAILS);
    setFile(null);
    setExistingId(fixedInvoice?.id ?? null);
    setError(null);
    setDuplicate(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const send = (dto: LinkPurchasesDto) =>
    link(dto, {
      onSuccess: (result) => {
        toast.success(purchases.length > 1 ? `Factura vinculada a ${purchases.length} compras` : 'Factura vinculada');
        if (result.file_error) toast.warning(`El archivo no se guardó: ${result.file_error}. Súbelo desde Facturas → "Faltan subir".`);
        onLinked?.();
        close();
      },
      onError: (failure) => {
        const apiError = failure as ApiClientError;
        if (apiError.code === INVOICE_DUPLICATE_CODE) {
          setDuplicate(dto);
          return;
        }
        toast.error(apiError.message);
      },
    });

  const submit = () => {
    const purchaseIds = purchases.map((purchase) => purchase.id);
    if (mode === 'existing') {
      if (!existingId) {
        setError('Elige la factura');
        return;
      }
      send({ purchase_ids: purchaseIds, invoice_id: existingId });
      return;
    }
    const detailsError = invoiceDetailsError(details);
    if (detailsError) {
      setError(detailsError);
      return;
    }
    send({ purchase_ids: purchaseIds, ...invoiceDetailsDto(details), file });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && close()}>
        <DialogContent className="sm:max-w-lg" data-testid="link-invoice-dialog">
          <DialogHeader>
            <DialogTitle>{fixedInvoice ? `Agregar compras a ${fixedInvoice.label}` : 'Registrar factura'}</DialogTitle>
            <DialogDescription>
              {purchases.length === 1 ? '1 compra' : `${purchases.length} compras`} · {formatMoney(total)}. No hace falta motivo: no mueve dinero.
            </DialogDescription>
          </DialogHeader>

          <ul className="scrollbar-thin max-h-28 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-2 text-xs">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="flex justify-between gap-2">
                <span className="truncate">{purchase.label}</span>
                <span className="shrink-0 tabular-nums">{formatMoney(purchase.amount)}</span>
              </li>
            ))}
          </ul>

          {!fixedInvoice && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Factura">
              {(['new', 'existing'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={mode === option}
                  onClick={() => {
                    setMode(option);
                    setError(null);
                  }}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-sm transition-colors',
                    mode === option ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
                  )}
                >
                  {option === 'new' ? 'Factura nueva' : 'Va en una factura ya registrada'}
                </button>
              ))}
            </div>
          )}

          {mode === 'existing' && !fixedInvoice && (
            <div className="space-y-1">
              <Label className="text-xs">Factura</Label>
              <ExistingInvoicePicker
                value={existingId}
                onChange={(id) => {
                  setExistingId(id);
                  setError(null);
                }}
              />
            </div>
          )}

          {mode === 'new' && (
            <div className="space-y-3">
              <InvoiceDetailsFields
                value={details}
                companyId={companyId}
                onChange={(next) => {
                  setDetails(next);
                  setError(null);
                }}
              />
              <div className="space-y-1">
                <Label className="text-xs">Archivo (foto o PDF)</Label>
                <InvoiceFileField value={file} onChange={setFile} />
                {!file && <p className="text-xs text-muted-foreground">Si no la adjuntas ahora, quedará en Facturas → "Faltan subir".</p>}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button type="button" onClick={submit} disabled={isPending || purchases.length === 0}>
              <FileText className="size-4" />
              {isPending ? 'Guardando…' : 'Guardar factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={duplicate !== null}
        onOpenChange={(next) => !next && setDuplicate(null)}
        title="¿Factura repetida?"
        description="Ya hay una factura con ese número de este proveedor. Regístrala solo si de verdad es otro documento."
        confirmLabel="Sí, registrarla"
        onConfirm={() => {
          if (!duplicate) return;
          const dto = duplicate;
          setDuplicate(null);
          send({ ...dto, allow_duplicate: true });
        }}
      />
    </>
  );
}
