import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { cn } from '@/lib/utils';
import { Label } from '@/presentation/components/shared/ui/label';

export interface InvoiceAnswer {
  // null = todavía no respondió.
  hasInvoice: boolean | null;
  file: File | null;
}

export const EMPTY_INVOICE_ANSWER: InvoiceAnswer = { hasInvoice: null, file: null };

interface InvoiceQuestionProps {
  question: string;
  value: InvoiceAnswer;
  onChange: (value: InvoiceAnswer) => void;
  error?: string;
}

// "¿Llevaba factura?" / "¿Emitimos factura?" (pedido explícito del usuario).
// Con "Sí" se puede adjuntar la foto o el archivo en el momento; si no se
// adjunta, la factura queda en "Faltan subir".
export function InvoiceQuestion({ question, value, onChange, error }: InvoiceQuestionProps) {
  const option = (answer: boolean, label: string) => (
    <button
      type="button"
      onClick={() => onChange({ hasInvoice: answer, file: answer ? value.file : null })}
      className={cn(
        'rounded-md border px-3 py-1.5 text-sm transition-colors',
        value.hasInvoice === answer ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
      )}
      aria-pressed={value.hasInvoice === answer}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-2" data-testid="invoice-question">
      <Label className="text-xs">{question}</Label>
      <div className="flex gap-2">
        {option(true, 'Sí')}
        {option(false, 'No')}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {value.hasInvoice && (
        <div className="space-y-1">
          <InvoiceFileField value={value.file} onChange={(file) => onChange({ ...value, file })} />
          {!value.file && <p className="text-xs text-muted-foreground">Si no la adjuntas ahora, quedará en Facturas → "Faltan subir".</p>}
        </div>
      )}
    </div>
  );
}
