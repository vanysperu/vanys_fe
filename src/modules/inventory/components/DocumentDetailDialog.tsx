import { Ban, Check, PackageCheck, Pencil, Send } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { DocumentFormDialog } from '@/modules/inventory/components/DocumentFormDialog';
import { statusVariant } from '@/modules/inventory/components/documentStatus';
import { useCancelDocument, useDispatchTransfer, usePostDocument, useReceiveTransfer, useStockDocument } from '@/modules/inventory/hooks/useInventory';
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, REASON_LABEL, type StockDocument } from '@/modules/inventory/types/inventory.types';
import { Badge } from '@/presentation/components/shared/ui/badge';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Input } from '@/presentation/components/shared/ui/input';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';

const numberFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

// Detalle de un documento de inventario y lo que se puede hacer según su
// estado y los permisos (plan §8.3).
export function DocumentDetailDialog({ documentId, onClose, companyId }: { documentId: number; onClose: () => void; companyId?: number }) {
  const { data: document, isLoading } = useStockDocument(documentId);
  const [editing, setEditing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const { mutate: post, isPending: isPosting } = usePostDocument();
  const { mutate: dispatch, isPending: isDispatching } = useDispatchTransfer();
  const { mutate: cancel, isPending: isCancelling } = useCancelDocument();
  const canUpdate = usePermissionButton('inventory.documents.update.button');
  const canPost = usePermissionButton('inventory.documents.post.button');
  const canDispatch = usePermissionButton('inventory.transfers.dispatch.button');
  const canReceive = usePermissionButton('inventory.transfers.receive.button');
  const canCancel = usePermissionButton('inventory.documents.cancel.button');
  const onError = (error: unknown) => toast.error((error as ApiClientError).message);

  if (editing && document) {
    return <DocumentFormDialog docType={document.doc_type} document={document} companyId={companyId} onClose={() => setEditing(false)} />;
  }
  if (receiving && document) return <ReceiveTransferDialog document={document} onClose={() => setReceiving(false)} />;

  const isDraft = document?.status === 'draft';
  const inTransit = document?.status === 'dispatched' || document?.status === 'partially_received';
  const cancellable = isDraft || (document?.status === 'posted' && document.doc_type !== 'transfer');

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent expandable className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{document ? `${DOC_TYPE_LABEL[document.doc_type]} ${document.number}` : 'Documento'}</DialogTitle>
          {document && (
            <DialogDescription>
              {REASON_LABEL[document.reason_code] ?? document.reason_code} · {formatDate(document.document_date)}
              {document.createdBy ? ` · ${document.createdBy}` : ''}
            </DialogDescription>
          )}
        </DialogHeader>
        {isLoading || !document ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(document.status)}>{DOC_STATUS_LABEL[document.status]}</Badge>
              <span>
                {document.warehouse.name}
                {document.targetWarehouse ? ` → ${document.targetWarehouse.name}` : ''}
              </span>
              {document.postedAt && <span className="text-xs text-muted-foreground">Confirmado {formatDateTime(document.postedAt)}</span>}
            </div>
            {document.notes && <p className="text-xs text-muted-foreground">{document.notes}</p>}
            {document.cancel_reason && <p className="text-xs text-destructive">Anulado: {document.cancel_reason}</p>}
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-2 py-1.5">Producto</th>
                    <th className="px-2 py-1.5">Color</th>
                    <th className="px-2 py-1.5">Lote</th>
                    <th className="px-2 py-1.5 text-right">Cantidad</th>
                    {document.doc_type === 'transfer' && <th className="px-2 py-1.5 text-right">Recibido</th>}
                    {document.lines.some((line) => line.unit_cost !== null) && <th className="px-2 py-1.5 text-right">Costo c/u</th>}
                  </tr>
                </thead>
                <tbody>
                  {document.lines.map((line) => (
                    <tr key={line.id} className="border-t">
                      <td className="px-2 py-1.5">{line.productName}</td>
                      <td className="px-2 py-1.5">{line.color || '—'}</td>
                      <td className="px-2 py-1.5">
                        {line.lotCode ?? '—'}
                        {line.expiry_date ? ` (vence ${formatDate(line.expiry_date)})` : ''}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono-nums">{numberFormatter.format(line.quantity)}</td>
                      {document.doc_type === 'transfer' && (
                        <td className="px-2 py-1.5 text-right font-mono-nums">{numberFormatter.format(line.received_quantity ?? 0)}</td>
                      )}
                      {document.lines.some((entry) => entry.unit_cost !== null) && (
                        <td className="px-2 py-1.5 text-right font-mono-nums">{line.unit_cost === null ? '—' : line.unit_cost.toFixed(4)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cancelReason !== null && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-destructive/40 p-2.5">
                <Input
                  className="min-w-64 flex-1"
                  placeholder="¿Por qué se anula?"
                  aria-label="Motivo de la anulación"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelReason.trim().length < 3 || isCancelling}
                  onClick={() =>
                    cancel(
                      { id: document.id, reason: cancelReason },
                      { onSuccess: () => { toast.success('Documento anulado'); setCancelReason(null); }, onError },
                    )
                  }
                >
                  Confirmar anulación
                </Button>
              </div>
            )}
          </div>
        )}
        {document && (
          <DialogFooter className="flex-wrap gap-2">
            {canCancel && cancellable && cancelReason === null && (
              <Button variant="outline" onClick={() => setCancelReason('')}>
                <Ban className="size-4 text-destructive" />
                Anular
              </Button>
            )}
            {canUpdate && isDraft && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="size-4" />
                Editar
              </Button>
            )}
            {isDraft && document.doc_type === 'transfer' && canDispatch && (
              <Button disabled={isDispatching} onClick={() => dispatch(document.id, { onSuccess: () => toast.success('Transferencia despachada'), onError })}>
                <Send className="size-4" />
                Despachar
              </Button>
            )}
            {isDraft && document.doc_type !== 'transfer' && canPost && (
              <Button disabled={isPosting} onClick={() => post(document.id, { onSuccess: () => toast.success('Documento confirmado'), onError })}>
                <Check className="size-4" />
                Confirmar
              </Button>
            )}
            {inTransit && canReceive && (
              <Button onClick={() => setReceiving(true)}>
                <PackageCheck className="size-4" />
                Recibir
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Recibir una transferencia: lo que llega de cada línea; lo que falta queda
// pendiente o se da por perdido en tránsito.
function ReceiveTransferDialog({ document, onClose }: { document: StockDocument; onClose: () => void }) {
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(document.lines.map((line) => [line.id, Math.max(0, line.quantity - (line.received_quantity ?? 0))])),
  );
  const [closeDifference, setCloseDifference] = useState(false);
  const { mutate: receive, isPending } = useReceiveTransfer();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Recibir {document.number}</DialogTitle>
          <DialogDescription>En {document.targetWarehouse?.name}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {document.lines.map((line) => {
            const remaining = Math.max(0, line.quantity - (line.received_quantity ?? 0));
            return (
              <li key={line.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {line.productName}
                  {line.color ? ` ${line.color}` : ''} <span className="text-xs text-muted-foreground">(faltan {numberFormatter.format(remaining)})</span>
                </span>
                <Input
                  type="number"
                  min={0}
                  max={remaining}
                  step="any"
                  className="w-24"
                  aria-label={`Recibido de ${line.productName}`}
                  value={quantities[line.id] ?? 0}
                  onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: Number(event.target.value) }))}
                />
              </li>
            );
          })}
        </ul>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={closeDifference} onCheckedChange={(checked) => setCloseDifference(checked === true)} aria-label="Dar por perdida la diferencia" />
          <span>
            Dar por perdido lo que no llegó
            <span className="block text-xs text-muted-foreground">Si no, queda pendiente en tránsito para recibirlo después.</span>
          </span>
        </label>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() =>
              receive(
                { id: document.id, lines: document.lines.map((line) => ({ line_id: line.id, quantity: quantities[line.id] ?? 0 })), closeDifference },
                {
                  onSuccess: (updated) => {
                    toast.success(updated.status === 'received' ? 'Transferencia recibida' : 'Recepción parcial registrada');
                    onClose();
                  },
                  onError: (error) => toast.error((error as ApiClientError).message),
                },
              )
            }
          >
            <PackageCheck className="size-4" />
            Registrar recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
