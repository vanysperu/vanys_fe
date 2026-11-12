import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useSendQuotationEmail } from '@/modules/quotations/hooks/useQuotationShare';
import { Button } from '@/presentation/components/shared/ui/button';
import { Checkbox } from '@/presentation/components/shared/ui/checkbox';
import { Input } from '@/presentation/components/shared/ui/input';
import { Label } from '@/presentation/components/shared/ui/label';
import { Textarea } from '@/presentation/components/shared/ui/textarea';
import type { ApiClientError } from '@/config/api.types';

// Mismas reglas que el backend (grulla_be: quotation/validators/share.validator.ts).
const emailSchema = z.object({
  to: z.string().email('Correo no válido'),
  cc: z.union([z.literal(''), z.string().email('Correo no válido')]),
  subject: z.string().trim().min(3, 'Mínimo 3 caracteres').max(200, 'Máximo 200 caracteres'),
  message: z.string().trim().min(1, 'Escribe un mensaje').max(2000, 'Máximo 2000 caracteres'),
  attachPdf: z.boolean(),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface ShareEmailPanelProps {
  quotationId: number;
  defaultTo: string | null;
  defaultSubject: string;
  defaultMessage: string;
  linkEnabled: boolean;
  onSent: () => void;
}

// Correo con enlace + PDF adjunto (el usuario pidió "por link o PDF, como
// salga mejor": van los dos). La respuesta del cliente le llega al correo de la
// empresa (grulla_be: Responder a = correo de la empresa).
export function ShareEmailPanel({ quotationId, defaultTo, defaultSubject, defaultMessage, linkEnabled, onSent }: ShareEmailPanelProps) {
  const { mutate, isPending, error } = useSendQuotationEmail(quotationId);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { to: defaultTo ?? '', cc: '', subject: defaultSubject, message: defaultMessage, attachPdf: true },
  });
  const attachPdf = watch('attachPdf');
  const apiError = error as ApiClientError | null;

  const submit = (values: EmailFormValues) =>
    mutate(values, {
      onSuccess: ({ result, message }) => {
        if (result.emailConfigured) toast.success(message);
        else toast.warning(message);
        onSent();
      },
    });

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="share-email-to" className="text-xs">
            Para
          </Label>
          <Input id="share-email-to" type="email" {...register('to')} />
          {errors.to && <p className="text-xs text-destructive">{errors.to.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="share-email-cc" className="text-xs">
            Copia (opcional)
          </Label>
          <Input id="share-email-cc" type="email" {...register('cc')} />
          {errors.cc && <p className="text-xs text-destructive">{errors.cc.message}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="share-email-subject" className="text-xs">
          Asunto
        </Label>
        <Input id="share-email-subject" {...register('subject')} />
        {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="share-email-message" className="text-xs">
          Mensaje
        </Label>
        <Textarea id="share-email-message" rows={5} {...register('message')} />
        {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={attachPdf} onCheckedChange={(checked) => setValue('attachPdf', checked === true)} />
        Adjuntar el PDF
      </label>
      <p className="text-xs text-muted-foreground">
        {linkEnabled ? 'Lleva el botón "Ver cotización" con el enlace.' : 'El enlace está apagado: el correo irá sin el botón "Ver cotización".'}{' '}
        {attachPdf && 'Un PDF ya enviado no se puede retirar, aunque después apagues el enlace.'}
      </p>
      {apiError && <p className="text-sm text-destructive">{apiError.message}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <Mail className="size-4" />
          {isPending ? 'Enviando...' : 'Enviar correo'}
        </Button>
      </div>
    </form>
  );
}
