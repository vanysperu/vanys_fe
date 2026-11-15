import { BellOff, BellRing, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import type { ApiClientError } from '@/config/api.types';
import { getPushSupport } from '@/lib/pushNotifications';
import {
  useDeviceSubscribed,
  useDisablePush,
  useEnablePush,
  usePushStatus,
  useSendTestPush,
} from '@/modules/pushNotifications/hooks/usePushNotifications';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';

interface PushNotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Tanto los errores de la API (ApiClientError) como los del navegador
// (permiso negado) traen un "message" listo para mostrar.
const showError = (error: unknown) => toast.error((error as ApiClientError).message || 'No se pudo completar la acción');

// Activar/desactivar los avisos en ESTE teléfono (cada teléfono se activa por
// separado). Hoy avisa cuando llega un pedido "Pendiente de cotizar" desde la web.
export function PushNotificationsDialog({ open, onOpenChange }: PushNotificationsDialogProps) {
  const support = getPushSupport();
  const { data: status, isLoading: loadingStatus } = usePushStatus(open);
  const { data: subscribed, isLoading: loadingDevice } = useDeviceSubscribed(open);
  const enable = useEnablePush();
  const disable = useDisablePush();
  const sendTest = useSendTestPush();

  const busy = enable.isPending || disable.isPending || sendTest.isPending;
  const loading = loadingStatus || loadingDevice;

  const handleEnable = () => {
    if (!status?.public_key) return;
    enable.mutate(status.public_key, {
      onSuccess: () => toast.success('Listo: este teléfono recibirá los avisos'),
      onError: showError,
    });
  };

  const handleDisable = () =>
    disable.mutate(undefined, { onSuccess: () => toast.success('Avisos desactivados en este teléfono'), onError: showError });

  const handleTest = () =>
    sendTest.mutate(undefined, {
      onSuccess: (result) =>
        result.sent > 0 ? toast.success('Aviso de prueba enviado: debería llegar en unos segundos') : toast.error('El aviso no se pudo entregar. Desactiva y vuelve a activar.'),
      onError: showError,
    });

  const renderBody = () => {
    if (support === 'needs-install')
      return (
        <p className="text-sm text-muted-foreground">
          En iPhone los avisos solo llegan con la app instalada: en Safari toca <strong>Compartir</strong> →{' '}
          <strong>Agregar a inicio</strong>, abre Vanys desde ese ícono y vuelve a esta opción.
        </p>
      );
    if (support === 'unsupported')
      return <p className="text-sm text-muted-foreground">Este navegador no permite notificaciones. Prueba con Chrome o con la app instalada.</p>;
    if (loading) return <p className="text-sm text-muted-foreground">Revisando este teléfono…</p>;
    if (!status?.enabled)
      return <p className="text-sm text-muted-foreground">Las notificaciones todavía no están configuradas en el servidor. Avísale al administrador.</p>;
    if (subscribed)
      return (
        <p className="flex items-start gap-2 text-sm">
          <BellRing className="mt-0.5 size-4 shrink-0 text-primary" />
          Este teléfono ya recibe los avisos de pedidos nuevos para cotizar.
        </p>
      );
    return (
      <p className="text-sm text-muted-foreground">
        Al activarlas, el teléfono te pedirá permiso. Te avisaremos cuando llegue un pedido nuevo para cotizar, aunque la app esté cerrada.
      </p>
    );
  };

  const canAct = support === 'supported' && !loading && Boolean(status?.enabled);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" />
            Notificaciones en este teléfono
          </DialogTitle>
          <DialogDescription>Avisos de pedidos nuevos para cotizar. Se activan en cada teléfono por separado.</DialogDescription>
        </DialogHeader>

        {renderBody()}

        <DialogFooter className="gap-2 sm:gap-2">
          {canAct && subscribed && (
            <>
              <Button type="button" variant="outline" disabled={busy} onClick={handleDisable}>
                <BellOff className="size-4" />
                Desactivar
              </Button>
              <Button type="button" disabled={busy} onClick={handleTest}>
                <Send className="size-4" />
                Enviar prueba
              </Button>
            </>
          )}
          {canAct && !subscribed && (
            <Button type="button" disabled={busy} onClick={handleEnable}>
              <BellRing className="size-4" />
              Activar notificaciones
            </Button>
          )}
          {!canAct && (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
