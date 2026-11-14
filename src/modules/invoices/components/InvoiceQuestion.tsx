import type { ReactNode } from 'react';

import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { PurchaseInvoicePicker } from '@/modules/invoices/components/PurchaseInvoicePicker';
import { cn } from '@/lib/utils';
import { Label } from '@/presentation/components/shared/ui/label';

export interface InvoiceAnswer {
  // null = todavía no respondió.
  hasInvoice: boolean | null;
  file: File | null;
  // Solo en compras: true = va en una factura ya registrada (una factura puede
  // cubrir varios productos) y existingInvoiceId dice en cuál.
  usesExisting: boolean;
  existingInvoiceId: number | null;
  // Solo con allowLater: "Sí, llega después" (hasInvoice queda en false: la
  // compra se registra sin factura y va a la bandeja "Compras sin factura").
  later: boolean;
}

export const EMPTY_INVOICE_ANSWER: InvoiceAnswer = {
  hasInvoice: null,
  file: null,
  usesExisting: false,
  existingInvoiceId: null,
  later: false,
};

interface InvoiceQuestionProps {
  question: string;
  value: InvoiceAnswer;
  onChange: (value: InvoiceAnswer) => void;
  error?: string;
  // Solo en compras: el item que se está comprando. Con esto se puede elegir
  // una factura ya registrada en vez de una nueva.
  purchaseItemId?: number;
  // Al corregir una compra que ya tiene factura: se puede dejar esa o pasarla
  // a otra. Sin esto, se ofrece crear una nueva.
  currentInvoice?: { id: number; hasFile: boolean };
  // Sprint 2, ítem 3 (opcional, por defecto el Sí/No de siempre): tres
  // respuestas, "Sí, ya la tengo" / "Sí, llega después" / "No lleva factura".
  allowLater?: boolean;
}

interface ChoiceProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Choice({ active, onClick, children }: ChoiceProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-sm transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
      )}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

// "¿Llevaba factura?" / "¿Emitimos factura?" (pedido explícito del usuario).
// Con "Sí" se puede adjuntar la foto o el archivo en el momento; si no se
// adjunta, la factura queda en "Faltan subir". En una compra, además, la
// factura puede ser una ya registrada: varios productos, una sola factura.
export function InvoiceQuestion({ question, value, onChange, error, purchaseItemId, currentInvoice, allowLater = false }: InvoiceQuestionProps) {
  const canUseExisting = purchaseItemId !== undefined;
  const hasCurrent = currentInvoice !== undefined;
  const usesExisting = canUseExisting && value.usesExisting;

  return (
    <div className="space-y-2" data-testid="invoice-question">
      <Label className="text-xs">{question}</Label>
      <div className="flex flex-wrap gap-2">
        <Choice active={value.hasInvoice === true} onClick={() => onChange({ ...value, hasInvoice: true, later: false })}>
          {allowLater ? 'Sí, ya la tengo' : 'Sí'}
        </Choice>
        {allowLater && (
          <Choice active={value.later} onClick={() => onChange({ ...EMPTY_INVOICE_ANSWER, hasInvoice: false, later: true })}>
            Sí, llega después
          </Choice>
        )}
        <Choice active={value.hasInvoice === false && !value.later} onClick={() => onChange({ ...EMPTY_INVOICE_ANSWER, hasInvoice: false })}>
          {allowLater ? 'No lleva factura' : 'No'}
        </Choice>
      </div>
      {value.later && (
        <p className="text-xs text-muted-foreground">
          Queda en Facturas → "Compras sin factura". Cuando llegue, la registras ahí para esta y otras compras a la vez.
        </p>
      )}
      {value.hasInvoice && canUseExisting && (
        <div className="flex flex-wrap gap-2" data-testid="invoice-source">
          <Choice active={!usesExisting} onClick={() => onChange({ ...value, usesExisting: false, existingInvoiceId: null })}>
            {hasCurrent ? 'Dejar la factura actual' : 'Factura nueva'}
          </Choice>
          <Choice active={usesExisting} onClick={() => onChange({ ...value, usesExisting: true, file: null })}>
            {hasCurrent ? 'Pasarla a otra factura' : 'Va en una factura ya registrada'}
          </Choice>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.hasInvoice && usesExisting && purchaseItemId !== undefined && (
        <div className="space-y-1">
          <PurchaseInvoicePicker
            itemId={purchaseItemId}
            value={value.existingInvoiceId}
            excludeInvoiceId={currentInvoice?.id}
            onChange={(invoiceId) => onChange({ ...value, existingInvoiceId: invoiceId })}
          />
          <p className="text-xs text-muted-foreground">Esta compra se suma a esa factura: no hace falta volver a subir el archivo.</p>
        </div>
      )}
      {value.hasInvoice && !usesExisting && hasCurrent && (
        <p className="text-xs text-muted-foreground">
          {currentInvoice.hasFile ? 'La factura ya tiene su archivo.' : 'Falta subir su archivo: hazlo en Facturas → "Faltan subir".'}
        </p>
      )}
      {value.hasInvoice && !usesExisting && !hasCurrent && (
        <div className="space-y-1">
          <InvoiceFileField value={value.file} onChange={(file) => onChange({ ...value, file })} />
          {!value.file && <p className="text-xs text-muted-foreground">Si no la adjuntas ahora, quedará en Facturas → "Faltan subir".</p>}
          {canUseExisting && (
            <p className="text-xs text-muted-foreground">
              ¿La misma factura cubre otros productos? Al registrar esas compras elige "Va en una factura ya registrada".
            </p>
          )}
        </div>
      )}
    </div>
  );
}
