import { useEffect, useRef, useState } from 'react';
import { Camera, FileText, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';

import { imageFileToWebp } from '@/lib/imageCompression';
import { CameraCaptureDialog } from '@/modules/invoices/components/CameraCaptureDialog';
import { INVOICE_MAX_FILE_MB, INVOICE_PDF_TYPE } from '@/modules/invoices/types/invoice.types';
import { Button } from '@/presentation/components/shared/ui/button';

interface InvoiceFileFieldProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

const MAX_BYTES = INVOICE_MAX_FILE_MB * 1024 * 1024;

// Foto o archivo de una factura (pedido explícito del usuario): "Tomar foto"
// abre la cámara; "Subir archivo" acepta una foto (se convierte a WEBP) o un
// PDF (tal cual). Solo prepara el archivo: lo sube quien guarda.
export function InvoiceFileField({ value, onChange }: InvoiceFileFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Vista previa de la foto (los PDF muestran solo su nombre).
  useEffect(() => {
    if (!value || value.type === INVOICE_PDF_TYPE) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const isPdf = file.type === INVOICE_PDF_TYPE;
    if (!isPdf && !file.type.startsWith('image/')) {
      toast.error('Solo se aceptan fotos o PDF');
      return;
    }
    setIsProcessing(true);
    try {
      const ready = isPdf ? file : await imageFileToWebp(file);
      if (ready.size > MAX_BYTES) {
        toast.error(`El archivo pesa ${(ready.size / 1024 / 1024).toFixed(1)} MB; el máximo es ${INVOICE_MAX_FILE_MB} MB`);
        return;
      }
      onChange(ready);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2" data-testid="invoice-file-field">
      {value ? (
        <div className="flex items-center gap-3 rounded-md border bg-background p-2">
          {previewUrl ? (
            <img src={previewUrl} alt="Foto de la factura" className="h-16 w-16 rounded object-cover" data-testid="invoice-file-preview" />
          ) : (
            <FileText className="size-8 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate font-medium">{value.name}</p>
            <p className="text-muted-foreground">{(value.size / 1024).toFixed(0)} KB</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="size-8" title="Quitar archivo" onClick={() => onChange(null)}>
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isProcessing} onClick={() => setCameraOpen(true)}>
            <Camera className="size-4" />
            Tomar foto
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isProcessing} onClick={() => inputRef.current?.click()}>
            <Paperclip className="size-4" />
            {isProcessing ? 'Procesando…' : 'Subir archivo'}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Foto o PDF, máx. {INVOICE_MAX_FILE_MB} MB. Las fotos se guardan en WEBP.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        data-testid="invoice-file-input"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <CameraCaptureDialog open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onChange} />
    </div>
  );
}
