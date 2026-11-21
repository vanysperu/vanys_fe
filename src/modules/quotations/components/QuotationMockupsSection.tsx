import { Download, FileText, ImageIcon, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDateTime } from '@/lib/dateUtils';
import { downloadBlob } from '@/lib/downloadBlob';
import { imageFileToWebp } from '@/lib/imageCompression';
import {
  useDisableQuotationMockup,
  useQuotationMockupFile,
  useQuotationMockups,
  useUploadQuotationMockup,
} from '@/modules/quotations/hooks/useQuotationMockups';
import type { QuotationMockup } from '@/modules/quotations/types/mockup.types';
import type { QuotationItem } from '@/modules/quotations/types/quotation.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { EmptyState } from '@/presentation/components/shared/EmptyState';
import { Button } from '@/presentation/components/shared/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/components/shared/ui/select';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

// Mismo tope que el backend (middlewares/upload-invoice.ts).
const MAX_FILE_MB = 5;
const ACCEPTED_TYPES = 'image/png,image/jpeg,image/webp,application/pdf';
const GENERAL = 'general';

const itemLabel = (item: QuotationItem) =>
  [item.product?.name ?? `Producto #${item.product_id}`, item.color].filter(Boolean).join(' · ');

// El archivo del diseño como URL local (se pide con la sesión).
function useMockupObjectUrl(mockupId: number): { url: string | null; blob: Blob | undefined; isLoading: boolean } {
  const { data: blob, isLoading } = useQuotationMockupFile(mockupId);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);
  return { url, blob, isLoading };
}

function MockupThumb({ mockup, onOpen }: { mockup: QuotationMockup; onOpen: () => void }) {
  const { url, isLoading } = useMockupObjectUrl(mockup.id);
  const isPdf = mockup.mime_type === 'application/pdf';
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary/50"
      aria-label={`Ver diseño ${mockup.caption ?? mockup.file_name}`}
    >
      <div className="flex aspect-square w-full items-center justify-center bg-muted/40">
        {isLoading || (!url && !isPdf) ? (
          <Skeleton className="size-full" />
        ) : isPdf ? (
          <FileText className="size-10 text-muted-foreground" />
        ) : (
          <img src={url ?? ''} alt={mockup.caption ?? mockup.file_name} className="size-full object-contain" loading="lazy" />
        )}
      </div>
      <div className="min-w-0 px-2 py-1.5">
        <p className="truncate text-xs font-medium">{mockup.caption ?? mockup.file_name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{formatDateTime(mockup.created_at)}</p>
      </div>
    </button>
  );
}

function MockupViewer({
  mockup,
  canRemove,
  onClose,
  onRemove,
}: {
  mockup: QuotationMockup;
  canRemove: boolean;
  onClose: () => void;
  onRemove: () => void;
}) {
  const { url, blob } = useMockupObjectUrl(mockup.id);
  const isPdf = mockup.mime_type === 'application/pdf';
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="pr-6">{mockup.caption ?? mockup.file_name}</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-64 items-center justify-center rounded-lg bg-muted/40">
          {!url ? (
            <Skeleton className="h-96 w-full" />
          ) : isPdf ? (
            <iframe src={url} title={mockup.file_name} className="h-[70svh] w-full rounded-lg" />
          ) : (
            <img src={url} alt={mockup.caption ?? mockup.file_name} className="max-h-[70svh] w-auto object-contain" />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Subido {formatDateTime(mockup.created_at)}
            {mockup.uploaded_by ? ` por ${mockup.uploaded_by}` : ''}
          </p>
          <div className="flex gap-2">
            {canRemove && (
              <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={onRemove}>
                <Trash2 className="size-4" />
                Quitar
              </Button>
            )}
            <Button type="button" size="sm" disabled={!blob} onClick={() => blob && downloadBlob(blob, mockup.file_name)}>
              <Download className="size-4" />
              Descargar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UploadMockupForm({ quotationId, items }: { quotationId: number; items: QuotationItem[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [itemId, setItemId] = useState<string>(GENERAL);
  const [caption, setCaption] = useState('');
  const [isPreparing, setIsPreparing] = useState(false);
  const { mutateAsync: upload, isPending } = useUploadQuotationMockup(quotationId);

  const handleFile = async (picked: File | undefined) => {
    if (!picked) return;
    setIsPreparing(true);
    try {
      // Las imágenes se achican a WEBP en el navegador (siguen nítidas y pesan
      // mucho menos); un PDF va tal cual.
      const file = picked.type === 'application/pdf' ? picked : await imageFileToWebp(picked);
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`El archivo pesa más de ${MAX_FILE_MB} MB`);
        return;
      }
      await upload({ file, quotationItemId: itemId === GENERAL ? null : Number(itemId), caption });
      toast.success('Diseño subido');
      setCaption('');
    } catch (error) {
      toast.error((error as ApiClientError).message ?? 'No se pudo subir el diseño');
    } finally {
      setIsPreparing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const busy = isPreparing || isPending;
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
      <div className="w-56 space-y-1">
        <Label className="text-xs">Producto</Label>
        <Select
          value={itemId}
          onValueChange={(value) => {
            if (!value) return;
            setItemId(value);
          }}
        >
          <SelectTrigger aria-label="Producto del diseño">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GENERAL}>General (toda la cotización)</SelectItem>
            {items.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {itemLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor="mockup-caption" className="text-xs">
          Descripción (opcional)
        </Label>
        <Input
          id="mockup-caption"
          maxLength={255}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="Ej.: logo en el pecho, versión 2"
        />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        data-testid="mockup-file-input"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Button type="button" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
        {busy ? 'Subiendo...' : 'Subir diseño'}
      </Button>
      <p className="w-full text-[11px] text-muted-foreground">
        Imagen (JPG, PNG, WEBP) o PDF, hasta {MAX_FILE_MB} MB. Solo lo ve el equipo: no sale en el PDF ni en el enlace del cliente.
      </p>
    </div>
  );
}

interface QuotationMockupsSectionProps {
  quotationId: number;
  items: QuotationItem[];
  // La pestaña está abierta: recién ahí se piden los diseños y sus archivos.
  active: boolean;
}

// Mockups (diseños) de la cotización (pedido del usuario, 21-nov): "subir los
// mockups y mirarlos en la cotización para saber los diseños y tenerlos a la
// vista". Agrupados por producto; clic para verlos en grande.
export function QuotationMockupsSection({ quotationId, items, active }: QuotationMockupsSectionProps) {
  const canUpload = usePermissionButton('cotizacion.mockups.upload.button');
  const canRemove = usePermissionButton('cotizacion.mockups.disable.button');
  const { data, isLoading } = useQuotationMockups(quotationId, active);
  const { mutate: removeMockup } = useDisableQuotationMockup(quotationId);
  const [viewing, setViewing] = useState<QuotationMockup | null>(null);
  const [removing, setRemoving] = useState<QuotationMockup | null>(null);

  const mockups = data?.data ?? [];
  // Grupos: primero los de cada producto (en el orden de la cotización), al final "General".
  const groups = [
    ...items.map((item) => ({ key: String(item.id), title: itemLabel(item), rows: mockups.filter((row) => row.quotation_item_id === item.id) })),
    {
      key: GENERAL,
      title: 'General',
      rows: mockups.filter((row) => row.quotation_item_id === null || !items.some((item) => item.id === row.quotation_item_id)),
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-4" data-testid="quotation-mockups">
      {canUpload && <UploadMockupForm quotationId={quotationId} items={items} />}

      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : groups.length === 0 ? (
        <EmptyState icon={ImageIcon} title="Todavía no hay diseños" description="Sube los mockups para tenerlos a la vista en esta cotización." />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <p className="text-sm font-medium">{group.title}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {group.rows.map((mockup) => (
                <MockupThumb key={mockup.id} mockup={mockup} onOpen={() => setViewing(mockup)} />
              ))}
            </div>
          </section>
        ))
      )}

      {viewing && (
        <MockupViewer
          mockup={viewing}
          canRemove={canRemove}
          onClose={() => setViewing(null)}
          onRemove={() => {
            setRemoving(viewing);
            setViewing(null);
          }}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="¿Quitar este diseño?"
        description={`"${removing?.caption ?? removing?.file_name ?? ''}" deja de verse en la cotización. Queda en el historial.`}
        confirmLabel="Quitar diseño"
        onConfirm={() => {
          if (!removing) return;
          removeMockup(removing.id, {
            onSuccess: () => toast.success('Diseño quitado'),
            onError: (error) => toast.error((error as ApiClientError).message),
          });
          setRemoving(null);
        }}
      />
    </div>
  );
}
