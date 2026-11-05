import { useEffect, useState } from 'react';
import { Check, HardDrive, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';

import { useConnectDrive, useDisconnectDrive, useDriveStatus } from '@/modules/invoices/hooks/useInvoices';
import type { DriveStatus } from '@/modules/invoices/types/invoice.types';
import { useUpdateCompany } from '@/modules/platform/hooks/useCompanies';
import type { Company } from '@/modules/platform/types/platform.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { Label } from '@/presentation/components/shared/ui/label';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import type { ApiClientError } from '@/config/api.types';
import { formatDate } from '@/lib/dateUtils';

interface InvoiceStorageDialogProps {
  company: Company | null;
  onClose: () => void;
}

const gigabytes = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(bytes < 1024 ** 3 ? 2 : 1)} GB`;

function DriveQuota({ quota }: { quota: NonNullable<DriveStatus['quota']> }) {
  if (quota.limit_bytes === null) return <p className="text-xs text-muted-foreground">Espacio ilimitado · usado {gigabytes(quota.usage_bytes)}</p>;
  const used = Math.min(quota.usage_bytes / quota.limit_bytes, 1);
  return (
    <div className="space-y-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={used > 0.9 ? 'h-full bg-destructive' : 'h-full bg-primary'} style={{ width: `${Math.round(used * 100)}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Usado {gigabytes(quota.usage_bytes)} de {gigabytes(quota.limit_bytes)} · libre {gigabytes(quota.limit_bytes - quota.usage_bytes)}
      </p>
    </div>
  );
}

// Dónde guarda sus facturas una empresa y su Google Drive. EXCLUSIVO del
// Super Administrador (pedido explícito del usuario): solo se abre desde
// Empresas, y el backend exige requireSystemRole.
export function InvoiceStorageDialog({ company, onClose }: InvoiceStorageDialogProps) {
  const [inSystem, setInSystem] = useState(true);
  const [inDrive, setInDrive] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const { data: status, isLoading } = useDriveStatus(company?.id ?? null);
  const { mutate: updateCompany, isPending: isSaving } = useUpdateCompany();
  const { mutate: connect, isPending: isConnecting } = useConnectDrive();
  const { mutateAsync: disconnect } = useDisconnectDrive();

  useEffect(() => {
    if (!company) return;
    setInSystem(company.invoice_storage_system ?? true);
    setInDrive(company.invoice_storage_drive ?? false);
  }, [company]);

  const showError = (error: unknown) => toast.error((error as ApiClientError).message);

  const save = () => {
    if (!company) return;
    updateCompany(
      { id: company.id, dto: { invoice_storage_system: inSystem, invoice_storage_drive: inDrive } },
      {
        onSuccess: () => {
          toast.success('Almacenamiento de facturas actualizado');
          onClose();
        },
        onError: showError,
      },
    );
  };

  const handleDisconnect = async () => {
    if (!company) return;
    try {
      await disconnect(company.id);
      toast.success('Google Drive desconectado. Los archivos que ya estaban en Drive se conservan.');
      setConfirmDisconnect(false);
    } catch (error) {
      showError(error);
    }
  };

  const connectDrive = () => company && connect(company.id, { onError: showError });

  return (
    <>
      <Dialog open={company !== null} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Facturas de {company?.business_name}</DialogTitle>
            <DialogDescription>Dónde se guardan las fotos y archivos de sus facturas.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox checked={inSystem} onCheckedChange={(checked) => setInSystem(checked === true)} />
              Guardar en el sistema
            </Label>
            <Label className="flex items-center gap-2 text-sm font-normal">
              <Checkbox checked={inDrive} onCheckedChange={(checked) => setInDrive(checked === true)} />
              Guardar en Google Drive
            </Label>
            {!inSystem && !inDrive && (
              <p className="text-xs text-destructive">Con las dos opciones apagadas, la empresa no podrá subir facturas.</p>
            )}
            {inSystem && inDrive && (
              <p className="text-xs text-muted-foreground">Se guarda en el sistema y se copia a Drive: si Drive falla, la factura no se pierde.</p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="size-4" /> Google Drive
            </p>
            {isLoading || !status ? (
              <Skeleton className="h-10 w-full" />
            ) : !status.configured ? (
              <p className="text-xs text-muted-foreground">Falta configurar Google en el servidor (variables GOOGLE_DRIVE_*).</p>
            ) : status.connected ? (
              <div className="space-y-2" data-testid="drive-connected">
                <p className="text-sm">
                  Conectado con <span className="font-medium">{status.email}</span>
                  {status.connected_at && <span className="text-muted-foreground"> desde el {formatDate(status.connected_at.date)}</span>}
                </p>
                {status.quota && <DriveQuota quota={status.quota} />}
                {status.error && <p className="text-xs text-destructive">{status.error}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isConnecting} onClick={connectDrive}>
                    <Link2 className="size-4" />
                    {status.error ? 'Volver a conectar' : 'Cambiar de cuenta'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDisconnect(true)}>
                    <Unlink className="size-4 text-destructive" />
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Inicia sesión con el Gmail de esta empresa. El sistema solo verá los archivos que él mismo cree.
                </p>
                {inDrive && <p className="text-xs text-destructive">Guardar en Drive está activo pero falta conectar la cuenta.</p>}
                <Button type="button" size="sm" disabled={isConnecting} onClick={connectDrive} data-testid="drive-connect">
                  <Link2 className="size-4" />
                  {isConnecting ? 'Abriendo Google…' : 'Conectar Google Drive'}
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" disabled={isSaving} onClick={save}>
              <Check className="size-4" />
              {isSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="¿Desconectar Google Drive?"
        description="Las facturas nuevas ya no se copiarán a ese Drive. Lo que ya está en Drive se conserva: el sistema nunca borra nada allá."
        confirmLabel="Desconectar"
        onConfirm={handleDisconnect}
      />
    </>
  );
}
