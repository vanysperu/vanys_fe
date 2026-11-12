import { ExternalLink, Eye, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { formatDate } from '@/lib/dateUtils';
import { useRegeneratePublicLink, useSetPublicLinkEnabled } from '@/modules/quotations/hooks/useQuotationShare';
import type { PublicLink } from '@/modules/quotations/types/share.types';
import { ConfirmDialog } from '@/presentation/components/shared/ConfirmDialog';
import { CopyableLinkField } from '@/presentation/components/shared/CopyableLinkField';
import { ToggleSwitch } from '@/presentation/components/shared/ToggleSwitch';
import { Button } from '@/presentation/components/shared/ui/button';
import { Label } from '@/presentation/components/shared/ui/label';
import { usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

interface PublicLinkPanelProps {
  quotationId: number;
  link: PublicLink;
}

const viewsText = (link: PublicLink): string => {
  if (!link.lastViewedAt) return 'El cliente todavía no la abrió.';
  const last = `${formatDate(link.lastViewedAt.date)} a las ${link.lastViewedAt.time}`;
  return link.viewCount === 1 ? `El cliente la abrió el ${last}.` : `El cliente la abrió ${link.viewCount} veces (la última, el ${last}).`;
};

// Enlace público de la cotización (Sprint 2, ítem 7): interruptor "Visible para
// el cliente" (encendido por defecto), el enlace para copiar o abrir, cuándo lo
// abrió el cliente y "Generar enlace nuevo".
export function PublicLinkPanel({ quotationId, link }: PublicLinkPanelProps) {
  const canToggle = usePermissionButton('cotizacion.publicLink.toggle.button');
  const canRegenerate = usePermissionButton('cotizacion.publicLink.regenerate.button');
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const { mutate: setEnabled, isPending: isToggling } = useSetPublicLinkEnabled(quotationId);
  const { mutateAsync: regenerate } = useRegeneratePublicLink(quotationId);

  const toggle = (enabled: boolean) =>
    setEnabled(enabled, {
      onSuccess: () => toast.success(enabled ? 'El cliente puede ver la cotización' : 'El cliente ya no puede ver la cotización'),
      onError: (error) => toast.error((error as unknown as ApiClientError).message),
    });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label htmlFor="public-link-visible" className="text-sm font-medium">
            Visible para el cliente
          </Label>
          <p className="text-xs text-muted-foreground">
            {link.enabled ? 'Cualquiera con el enlace puede verla, sin iniciar sesión.' : 'Apagado: el enlace muestra "no disponible".'}
          </p>
        </div>
        <ToggleSwitch
          id="public-link-visible"
          label="Visible para el cliente"
          checked={link.enabled}
          disabled={!canToggle || isToggling}
          onCheckedChange={toggle}
        />
      </div>

      {link.enabled && (
        <>
          <CopyableLinkField url={link.url} label="Enlace de la cotización" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="size-3.5" aria-hidden />
              {viewsText(link)}
            </p>
            <div className="flex gap-1">
              <Button asChild variant="ghost" size="sm">
                <a href={link.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" />
                  Abrir
                </a>
              </Button>
              {canRegenerate && (
                <Button variant="ghost" size="sm" onClick={() => setConfirmRegenerate(true)}>
                  <RefreshCw className="size-4" />
                  Enlace nuevo
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title="¿Generar un enlace nuevo?"
        description="El enlace anterior dejará de funcionar para siempre. Úsalo si lo mandaste a la persona equivocada."
        confirmLabel="Generar enlace nuevo"
        variant="destructive"
        onConfirm={async () => {
          try {
            await regenerate(undefined);
            toast.success('Enlace nuevo listo: el anterior ya no funciona');
          } catch (error) {
            toast.error((error as ApiClientError).message);
          }
        }}
      />
    </div>
  );
}
