import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';

import type { CreatedApiKey } from '@/modules/apiKeys/types/apiKey.types';
import { Button } from '@/presentation/components/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/presentation/components/shared/ui/dialog';

interface CreatedApiKeyDialogProps {
  apiKey: CreatedApiKey | null;
  onClose: () => void;
}

// La key completa se muestra UNA sola vez, justo después de crearla: en la
// base solo queda su hash, así que si se pierde hay que revocarla y crear
// otra. Por eso el aviso y el botón de copiar van bien a la vista.
export function CreatedApiKeyDialog({ apiKey, onClose }: CreatedApiKeyDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey.plain_key);
      setCopied(true);
      toast.success('API key copiada');
    } catch {
      toast.error('No se pudo copiar: selecciónala y cópiala a mano');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) return;
    setCopied(false);
    onClose();
  };

  return (
    <Dialog open={apiKey !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API key creada</DialogTitle>
          <DialogDescription>
            {apiKey ? `${apiKey.name} · ${apiKey.company.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>
            Cópiala ahora y guárdala en el servidor de la web. <strong>No se vuelve a mostrar</strong>: si se pierde,
            revócala y crea otra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code
            className="min-w-0 flex-1 break-all rounded-md border bg-muted px-3 py-2 font-mono text-xs select-all"
            data-testid="created-api-key"
          >
            {apiKey?.plain_key}
          </code>
          <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Copiar" aria-label="Copiar API key">
            {copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Se envía en la cabecera <code className="font-mono">X-Api-Key</code> desde el servidor de la web, nunca desde
          el navegador.
        </p>

        <DialogFooter>
          <Button type="button" onClick={() => handleOpenChange(false)}>
            Ya la guardé
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
