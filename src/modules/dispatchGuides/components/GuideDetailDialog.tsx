import { zodResolver } from '@hookform/resolvers/zod';
import { Ban, Download, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';
import { GuideStatusBadge } from '@/modules/dispatchGuides/components/GuideStatusBadge';
import { useGuide, useGuidePdf, useUploadGuidePdf, useVoidGuide } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { voidGuideSchema, type VoidGuideFormValues } from '@/modules/dispatchGuides/schemas/dispatchGuide.schema';
import { IDENTITY_DOC_TYPES } from '@/modules/dispatchGuides/types/dispatchGuide.types';
import { InvoiceFileField } from '@/modules/invoices/components/InvoiceFileField';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

interface GuideDetailDialogProps {
  guideId: number;
  onClose: () => void;
}

const Row = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="text-sm">
    <span className="text-muted-foreground">{label}: </span>
    {value || '—'}
  </div>
);

// Visor del PDF de la guía (privado: se baja con la sesión) con descarga.
function GuidePdfViewer({ guideId, fileName }: { guideId: number; fileName: string }) {
  const { data: blob, isLoading } = useGuidePdf(guideId);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (isLoading || !url) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button asChild size="sm" variant="outline">
          <a href={url} download={fileName}>
            <Download className="size-3.5" /> Descargar
          </a>
        </Button>
      </div>
      {blob?.type === 'application/pdf' ? (
        <iframe src={url} title="Guía de remisión" className="h-[55vh] w-full rounded-lg border" />
      ) : (
        <img src={url} alt="Guía de remisión" className="max-h-[55vh] w-full rounded-lg border object-contain" />
      )}
    </div>
  );
}

/**
 * Detalle de una guía: sus datos, el PDF de SUNAT (verlo, subirlo o
 * reemplazarlo) y "Anular" para una registrada (solo administradores; la baja
 * en SUNAT se hace en SOL).
 */
export function GuideDetailDialog({ guideId, onClose }: GuideDetailDialogProps) {
  const { data: guide, isLoading } = useGuide(guideId);
  const canUpload = usePermissionButton('dispatch_guide.uploadFile.button');
  const canDownload = usePermissionButton('dispatch_guide.downloadFile.button');
  const canVoid = usePermissionButton('dispatch_guide.void.button');
  const [file, setFile] = useState<File | null>(null);
  const [voiding, setVoiding] = useState(false);
  const { mutate: uploadPdf, isPending: isUploading } = useUploadGuidePdf();
  const { mutate: voidGuide, isPending: isVoiding } = useVoidGuide();
  const voidForm = useForm<VoidGuideFormValues>({ resolver: zodResolver(voidGuideSchema), defaultValues: { reason: '' } });

  const upload = () => {
    if (!file) return;
    uploadPdf(
      { id: guideId, file },
      {
        onSuccess: () => {
          toast.success('Archivo de la guía guardado');
          setFile(null);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );
  };

  const submitVoid = (values: VoidGuideFormValues) =>
    voidGuide(
      { id: guideId, reason: values.reason },
      {
        onSuccess: () => {
          toast.success('Guía anulada. Recuerda darla de baja en SUNAT (SOL).');
          setVoiding(false);
        },
        onError: (error) => toast.error((error as ApiClientError).message),
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl" data-testid="guide-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Guía {guide?.number_text ?? `(borrador #${guideId})`}
            {guide && <GuideStatusBadge status={guide.status} />}
          </DialogTitle>
          <DialogDescription>
            {guide ? `${guide.reason_code} · ${guide.reason_label}${guide.quotation_id ? ` · Cotización #${guide.quotation_id}` : ''}` : ''}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {guide && (
          <div className="space-y-4">
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              <Row label="Emisión" value={formatDate(guide.issue_date)} />
              <Row label="Inicio del traslado" value={formatDate(guide.transfer_start_date)} />
              <Row label="Destinatario" value={`${guide.recipient_name ?? ''} (${IDENTITY_DOC_TYPES[guide.recipient_doc_type ?? ''] ?? ''} ${guide.recipient_doc_number ?? ''})`} />
              <Row label="Peso bruto" value={guide.gross_weight_kg === null ? null : `${guide.gross_weight_kg} kg`} />
              <Row label="Partida" value={[guide.origin_address, guide.origin_ubigeo].filter(Boolean).join(' · ')} />
              <Row label="Llegada" value={[guide.destination_address, guide.destination_ubigeo].filter(Boolean).join(' · ')} />
              <Row
                label="Transporte"
                value={
                  guide.transport_mode === 'public'
                    ? `Público · ${guide.carrier_name ?? ''} ${guide.carrier_ruc ?? ''}`
                    : guide.light_vehicle
                      ? 'Privado · vehículo liviano (M1/L)'
                      : `Privado · ${guide.vehicles.map((vehicle) => vehicle.plate).join(', ')} · ${guide.drivers.map((driver) => `${driver.first_names} ${driver.last_names}`).join(', ')}`
                }
              />
              {guide.exit_document && <Row label="Salida de almacén" value={`${guide.exit_document.number_text} (${guide.exit_document.status === 'posted' ? 'confirmada' : 'pendiente'})`} />}
              {guide.void_reason && <Row label="Motivo de anulación" value={guide.void_reason} />}
            </div>

            <ul className="divide-y rounded-md border text-sm">
              {guide.lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3 px-3 py-2">
                  <span>{line.description}</span>
                  <span className="shrink-0 tabular-nums">
                    {line.quantity} {line.unit_code}
                  </span>
                </li>
              ))}
            </ul>

            {guide.pdf && canDownload && <GuidePdfViewer guideId={guide.id} fileName={guide.pdf.file_name} />}
            {canUpload && guide.status !== 'voided' && (
              <div className="space-y-2 rounded-md border p-3">
                <Label>{guide.pdf ? 'Reemplazar el PDF de SUNAT' : 'Subir el PDF de SUNAT'}</Label>
                <InvoiceFileField value={file} onChange={setFile} />
                <Button type="button" size="sm" onClick={upload} disabled={!file || isUploading}>
                  <Upload className="size-3.5" /> {isUploading ? 'Subiendo…' : 'Guardar archivo'}
                </Button>
              </div>
            )}

            {canVoid && guide.status === 'manual' && voiding && (
              <form
                noValidate
                onSubmit={(event) => {
                  event.stopPropagation();
                  void voidForm.handleSubmit(submitVoid)(event);
                }}
                className="space-y-2 rounded-md border border-destructive/40 p-3"
              >
                <Label htmlFor="guide-void-reason">Motivo de la anulación</Label>
                <Textarea id="guide-void-reason" rows={2} {...voidForm.register('reason')} />
                {voidForm.formState.errors.reason && <p className="text-xs text-destructive">{voidForm.formState.errors.reason.message}</p>}
                <p className="text-xs text-muted-foreground">Anular aquí no la da de baja en SUNAT: eso se hace en SOL. Si la guía descontó stock, se devuelve.</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setVoiding(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="destructive" size="sm" disabled={isVoiding}>
                    Anular guía
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
        <DialogFooter>
          {guide && canVoid && guide.status === 'manual' && !voiding && (
            <Button type="button" variant="outline" className="text-destructive" onClick={() => setVoiding(true)}>
              <Ban className="size-4" /> Anular
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
