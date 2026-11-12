import { KeyRound, MailCheck, MailWarning, MessageCircle, Send } from 'lucide-react';
import { useState } from 'react';

import { buildWhatsAppLink } from '@/lib/whatsapp';
import { formatDate } from '@/lib/dateUtils';
import { useSendPasswordLink } from '@/modules/users/hooks/useSendPasswordLink';
import type { PasswordLinkPurpose, PasswordLinkResult } from '@/modules/users/types/createUser.types';
import { CopyableLinkField } from '@/presentation/components/shared/CopyableLinkField';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';
import { cn } from '@/lib/utils';
import type { ApiClientError } from '@/config/api.types';

export interface PasswordLinkTarget {
  id: number;
  fullName: string;
  email: string;
  phone_number: string | null;
}

interface PasswordLinkDialogProps {
  user: PasswordLinkTarget;
  onClose: () => void;
  // Al crear un usuario el enlace ya viene en la respuesta: se muestra directo.
  initialResult?: { purpose: PasswordLinkPurpose; result: PasswordLinkResult };
}

const OPTIONS: { purpose: PasswordLinkPurpose; title: string; description: string }[] = [
  {
    purpose: 'invite',
    title: 'Reenviar invitación',
    description: 'Para que cree su contraseña. Vence en 72 horas.',
  },
  {
    purpose: 'reset',
    title: 'Enlace para restablecer',
    description: 'Para que elija una contraseña nueva. Vence en 30 minutos.',
  },
];

const WHATSAPP_TEXT: Record<PasswordLinkPurpose, (name: string, url: string) => string> = {
  invite: (name, url) => `Hola ${name}, este es tu enlace para crear tu contraseña en Vanys: ${url}`,
  reset: (name, url) => `Hola ${name}, este es tu enlace para elegir una nueva contraseña en Vanys: ${url}`,
};

// Enlaces de contraseña desde Usuarios (Sprint 2, pedido explícito del
// usuario: "link para crear contraseña o link para recuperarla"). Primero se
// elige qué enlace mandar; después se ve el resultado. Si el correo no está
// configurado (o no llega), el enlace se copia o se manda por WhatsApp.
export function PasswordLinkDialog({ user, onClose, initialResult }: PasswordLinkDialogProps) {
  const [purpose, setPurpose] = useState<PasswordLinkPurpose>(initialResult?.purpose ?? 'invite');
  const [result, setResult] = useState<PasswordLinkResult | null>(initialResult?.result ?? null);
  const { mutate, isPending, error } = useSendPasswordLink();
  const apiError = error as ApiClientError | null;
  const firstName = user.fullName.split(' ')[0] ?? user.fullName;

  const send = () => mutate({ id: user.id, purpose }, { onSuccess: setResult });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? (purpose === 'invite' ? 'Invitación lista' : 'Enlace listo') : 'Enlace de contraseña'}</DialogTitle>
          <DialogDescription>{user.fullName}</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            {result.emailConfigured ? (
              <p className="flex items-start gap-2 text-sm">
                <MailCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                Le enviamos el enlace a <strong>{user.email}</strong>. Si no le llega, cópialo o mándalo por WhatsApp.
              </p>
            ) : (
              <p className="flex items-start gap-2 text-sm text-warning">
                <MailWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
                El correo no está configurado en el servidor: copia el enlace o mándalo por WhatsApp.
              </p>
            )}
            <CopyableLinkField url={result.url} label="Enlace de contraseña" />
            <p className="text-xs text-muted-foreground">
              Vence el {formatDate(result.expiresAt.date)} a las {result.expiresAt.time}. Sirve una sola vez.
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="radiogroup" aria-label="Qué enlace mandar">
            {OPTIONS.map((option) => (
              <button
                key={option.purpose}
                type="button"
                role="radio"
                aria-checked={purpose === option.purpose}
                onClick={() => setPurpose(option.purpose)}
                className={cn(
                  'w-full rounded-lg border p-3 text-left transition-colors',
                  purpose === option.purpose ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                )}
              >
                <span className="block text-sm font-medium">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
            {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {result ? (
            <>
              <Button asChild variant="outline">
                <a href={buildWhatsAppLink({ phone: user.phone_number, text: WHATSAPP_TEXT[purpose](firstName, result.url) })} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" />
                  Enviar por WhatsApp
                </a>
              </Button>
              <Button onClick={onClose}>Listo</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={send} disabled={isPending}>
                {purpose === 'invite' ? <Send className="size-4" /> : <KeyRound className="size-4" />}
                {isPending ? 'Enviando...' : 'Enviar enlace'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
