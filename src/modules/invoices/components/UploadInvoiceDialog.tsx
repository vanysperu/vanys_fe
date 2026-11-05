import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { useUploadInvoiceFile } from '@/modules/invoices/hooks/useInvoices';
import { INVOICE_TYPE_LABEL, type Invoice } from '@/modules/invoices/types/invoice.types';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import type { ApiClientError } from '@/config/api.types';

interface UploadInvoiceDialogProps {
  invoice: Invoice | null;
  onClose: () => void;
}

// Subir (o reemplazar) la foto/archivo de una factura ya registrada: es como se
// vacía la lista "Faltan subir".
export function UploadInvoiceDialog({ invoice, onClose }: UploadInvoiceDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const { mutate: upload, isPending } = useUploadInvoiceFile();

  useEffect(() => {
    if (invoice) return;
    setFile(null);
  }, [invoice]);

  const save = () => {
    if (!invoice || !file) return;
    upload(
      { invoiceId: invoice.id, file },
      {
        onSuccess: () => {
          toast.success('Factura subida');
          onClose();
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {invoice?.has_file ? 'Reemplazar' : 'Subir'} factura · {invoice?.quotation_code}
          </DialogTitle>
          <DialogDescription>
            {invoice ? `${INVOICE_TYPE_LABEL[invoice.type]} · ${invoice.description}` : ''}
          </DialogDescription>
        </DialogHeader>
        <InvoiceFileField value={file} onChange={setFile} />
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={save} disabled={!file || isPending}>
            <Upload className="size-4" />
            {isPending ? 'Subiendo…' : 'Subir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
