import { FileDown, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { downloadBlob } from '@/lib/downloadBlob';
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

// El dispositivo puede compartir archivos (Web Share API con archivos):
// Android con Chrome, iPhone con Safari y Windows con Chrome/Edge (si tiene
// WhatsApp de escritorio, aparece en el menú). wa.me NO permite adjuntar
// archivos: sin esto, el PDF se descarga y se arrastra al chat a mano.
const canSharePdfFile = (): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
  const probe = new File([new Blob(['%PDF'], { type: 'application/pdf' })], 'prueba.pdf', { type: 'application/pdf' });
  return navigator.canShare({ files: [probe] });
};

// WhatsApp gratis y simple (pedido del usuario): abre WhatsApp con el número
// del cliente y el mensaje ya escrito con el enlace; la persona solo presiona
// Enviar. Donde se puede, "Enviar PDF y enlace" manda las dos cosas de una
// vez: el archivo y el mensaje con el enlace (investigado el 21-nov; mandarlo
// sin que nadie toque nada solo se puede con la API de WhatsApp Business, de pago).
export function ShareWhatsAppPanel({ quotationId, quotationCode, defaultPhone, defaultMessage, linkEnabled }: ShareWhatsAppPanelProps) {
  const [phone, setPhone] = useState(defaultPhone ?? '');
  const [message, setMessage] = useState(defaultMessage);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const { mutate: logShare } = useLogWhatsappShare(quotationId);
  const normalizedPhone = toWhatsAppPhone(phone);
  const phoneInvalid = phone.trim() !== '' && !normalizedPhone;

  const fileShareSupported = canSharePdfFile();
  const [isDownloading, setIsDownloading] = useState(false);

  // En la PC sin menú de compartir: se baja el PDF para arrastrarlo al chat.
  const downloadPdf = async () => {
    setIsDownloading(true);
    try {
      downloadBlob(await downloadQuotationPdf(quotationId), `${quotationCode}.pdf`);
    } catch {
      toast.error('No se pudo descargar el PDF');
    } finally {
      setIsDownloading(false);
    }
  };

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
      {!fileShareSupported && (
        <p className="text-xs text-muted-foreground">
          Para mandar también el PDF desde esta computadora: descárgalo, abre WhatsApp y arrástralo al chat.
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        {fileShareSupported ? (
          <Button variant="outline" onClick={sharePdf} disabled={isSharingFile}>
            <FileDown className="size-4" />
            {isSharingFile ? 'Preparando...' : 'Enviar PDF y enlace'}
          </Button>
        ) : (
          <Button variant="outline" onClick={downloadPdf} disabled={isDownloading}>
            <FileDown className="size-4" />
            {isDownloading ? 'Preparando...' : 'Descargar PDF'}
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
