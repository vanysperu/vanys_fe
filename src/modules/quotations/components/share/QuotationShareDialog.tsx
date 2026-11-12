import { Mail, MessageCircle } from 'lucide-react';

import { formatDate } from '@/lib/dateUtils';
import { formatSoles } from '@/lib/money';
import { PublicLinkPanel } from '@/modules/quotations/components/share/PublicLinkPanel';
import { ShareEmailPanel } from '@/modules/quotations/components/share/ShareEmailPanel';
import { ShareWhatsAppPanel } from '@/modules/quotations/components/share/ShareWhatsAppPanel';
import { usePublicLink } from '@/modules/quotations/hooks/useQuotationShare';
import type { Quotation } from '@/modules/quotations/types/quotation.types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/components/shared/ui/dialog';
import { Skeleton } from '@/presentation/components/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/shared/ui/tabs';
import { useAccess, usePermissionButton } from '@/presentation/hooks/shared/useAccess';
import type { ApiClientError } from '@/config/api.types';

interface QuotationShareDialogProps {
  quotation: Quotation;
  open: boolean;
  onClose: () => void;
}

const quotationCodeOf = (id: number) => `COT-${String(id).padStart(4, '0')}`;

// "Compartir" del detalle de la cotización (Sprint 2, ítem 7, pedido explícito
// del usuario): enlace para que el cliente la vea sin iniciar sesión (con su
// interruptor), envío por WhatsApp (gratis, wa.me) y por correo (enlace + PDF).
export function QuotationShareDialog({ quotation, open, onClose }: QuotationShareDialogProps) {
  const { data: access } = useAccess();
  const canWhatsapp = usePermissionButton('cotizacion.share.whatsapp.button');
  const canEmail = usePermissionButton('cotizacion.share.email.button');
  const { data: link, isLoading, error } = usePublicLink(quotation.id, open);
  const apiError = error as ApiClientError | null;

  const code = quotationCodeOf(quotation.id);
  const clientName = quotation.client?.name ?? '';
  const firstName = clientName.split(' ')[0] ?? clientName;
  const total = formatSoles(quotation.total);
  const validUntil = quotation.valid_until ? formatDate(quotation.valid_until) : null;
  const companyName = access?.companyName ?? '';

  const whatsappMessage = (url: string) =>
    `Hola ${firstName}, te enviamos la cotización ${code} por ${total}${validUntil ? `, válida hasta el ${validUntil}` : ''}. Puedes verla aquí: ${url}`;
  const emailMessage = `Hola ${clientName},\n\nTe enviamos la cotización ${code} por ${total}. Puedes verla en línea o en el PDF adjunto.\n\nQuedamos atentos a tus comentarios.`;
  const defaultTab = canWhatsapp ? 'whatsapp' : 'email';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartir {code}</DialogTitle>
          <DialogDescription>{clientName}</DialogDescription>
        </DialogHeader>

        {isLoading && <Skeleton className="h-28 w-full" />}
        {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}

        {link && (
          <div className="space-y-4">
            <PublicLinkPanel quotationId={quotation.id} link={link} />

            {(canWhatsapp || canEmail) && (
              <Tabs defaultValue={defaultTab}>
                <TabsList className="w-full">
                  {canWhatsapp && (
                    <TabsTrigger value="whatsapp" className="flex-1">
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </TabsTrigger>
                  )}
                  {canEmail && (
                    <TabsTrigger value="email" className="flex-1">
                      <Mail className="size-4" />
                      Correo
                    </TabsTrigger>
                  )}
                </TabsList>
                {canWhatsapp && (
                  <TabsContent value="whatsapp" className="pt-3">
                    <ShareWhatsAppPanel
                      key={link.url}
                      quotationId={quotation.id}
                      quotationCode={code}
                      defaultPhone={quotation.client?.phone ?? null}
                      defaultMessage={whatsappMessage(link.url)}
                      linkEnabled={link.enabled}
                    />
                  </TabsContent>
                )}
                {canEmail && (
                  <TabsContent value="email" className="pt-3">
                    <ShareEmailPanel
                      quotationId={quotation.id}
                      defaultTo={quotation.client?.email ?? null}
                      defaultSubject={companyName ? `Cotización ${code} - ${companyName}` : `Cotización ${code}`}
                      defaultMessage={emailMessage}
                      linkEnabled={link.enabled}
                      onSent={onClose}
                    />
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
