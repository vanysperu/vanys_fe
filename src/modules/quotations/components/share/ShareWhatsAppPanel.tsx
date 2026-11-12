import { FileDown, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { buildWhatsAppLink, toWhatsAppPhone } from '@/lib/whatsapp';
import { downloadQuotationPdf } from '@/modules/quotations/api/quotations.api';
import { useLogWhatsappShare } from '@/modules/quotations/hooks/useQuotationShare';
import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';

interface ShareWhatsAppPanelProps {
  quotationId: number;
  quotationCode: string;
  defaultPhone: string | null;
  defaultMessage: string;
  // false = el enlace está apagado: el mensaje no puede llevarlo.
  linkEnabled: boolean;
}

// El teléfono puede compartir archivos (Web Share API con archivos): Android
// con Chrome y iPhone con Safari. En la PC no: ahí va el enlace por wa.me.
const canSharePdfFile = (): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  const probe = new File([new Blob(['%PDF'], { type: 'application/pdf' })], 'prueba.pdf', { type: 'application/pdf' });
  return navigator.canShare({ files: [probe] });
};

// WhatsApp gratis y simple (pedido del usuario): abre WhatsApp con el número
// del cliente y el mensaje ya escrito con el enlace; la persona solo presiona
// Enviar. En el celular también se puede mandar el PDF como archivo.
export function ShareWhatsAppPanel({ quotationId, quotationCode, defaultPhone, defaultMessage, linkEnabled }: ShareWhatsAppPanelProps) {
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [message, setMessage] = useState(defaultMessage);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const { mutate: logShare } = useLogWhatsappShare(quotationId);
  const normalizedPhone = toWhatsAppPhone(phone);
  const phoneInvalid = phone.trim() !== '' && !normalizedPhone;

  const sharePdf = async () => {
    setIsSharingFile(true);
    try {
      const blob = await downloadQuotationPdf(quotationId);
      const file = new File([blob], `${quotationCode}.pdf`, { type: 'application/pdf' });
      await navigator.share({ files: [file], text: message });
      logShare(normalizedPhone);
    } catch (error) {
      // Cancelar el menú de compartir no es un error.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('No se pudo compartir el PDF desde este dispositivo');
    } finally {
      setIsSharingFile(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="share-whatsapp-phone" className="text-xs">
          Celular del cliente
        </Label>
        <Input
          id="share-whatsapp-phone"
          inputMode="tel"
          placeholder="987 654 321"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className={phoneInvalid ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
          {phoneInvalid
            ? 'Número no válido: escribe los 9 dígitos del celular (o con el código de país).'
            : 'Sin número, WhatsApp te deja elegir el chat.'}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="share-whatsapp-message" className="text-xs">
          Mensaje
        </Label>
        <Textarea id="share-whatsapp-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
      </div>
      {!linkEnabled && (
        <p className="text-xs text-warning">El enlace está apagado: prende "Visible para el cliente" para mandarlo, o comparte el PDF.</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {canSharePdfFile() && (
          <Button variant="outline" onClick={sharePdf} disabled={isSharingFile}>
            <FileDown className="size-4" />
            {isSharingFile ? 'Preparando...' : 'Compartir PDF'}
          </Button>
        )}
        {linkEnabled && !phoneInvalid ? (
          <Button asChild>
            <a
              href={buildWhatsAppLink({ phone: normalizedPhone, text: message })}
              target="_blank"
              rel="noreferrer"
              onClick={() => logShare(normalizedPhone)}
            >
              <MessageCircle className="size-4" />
              Abrir WhatsApp
            </a>
          </Button>
        ) : (
          <Button disabled>
            <MessageCircle className="size-4" />
            Abrir WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}
