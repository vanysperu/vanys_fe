import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/presentation/components/shared/ui/button';
import { Input } from '@/presentation/components/shared/ui/input';

interface CopyableLinkFieldProps {
  url: string;
  // Texto accesible del campo (ej. "Enlace de invitación").
  label: string;
}

const COPIED_FEEDBACK_MS = 2000;

// Enlace de solo lectura con botón "Copiar" (enlaces de contraseña, cotización
// compartida...). Genérico: no sabe qué enlace es.
export function CopyableLinkField({ url, label }: CopyableLinkFieldProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Enlace copiado');
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      toast.error('No se pudo copiar: selecciona el enlace y cópialo a mano');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} aria-label={label} className="min-w-0 flex-1 font-mono text-xs" onFocus={(event) => event.target.select()} />
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
}
