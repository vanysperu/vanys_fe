import { History } from 'lucide-react';

import { Badge } from '@/presentation/components/shared/ui/badge';

interface CorrectedBadgeProps {
  count: number;
  // Si el rol tiene el botón de historial de esa fuente (usePermissionButton
  // del recurso *.corrections.button). Sin permiso el badge se ve igual pero
  // no se abre: así no se dispara un pedido que respondería 403.
  canOpen: boolean;
  onOpen: () => void;
}

// Badge "Corregido (n)" de una fila de dinero. Nada si no tiene correcciones.
export function CorrectedBadge({ count, canOpen, onOpen }: CorrectedBadgeProps) {
  if (count <= 0) return null;

  const label = `Corregido${count > 1 ? ` (${count})` : ''}`;

  if (!canOpen) {
    return (
      <Badge variant="default" className="ml-2 align-middle" title="Este registro tiene correcciones">
        <History className="size-3" />
        {label}
      </Badge>
    );
  }

  return (
    <button type="button" title="Ver historial de correcciones" onClick={onOpen} className="ml-2 inline-flex align-middle">
      <Badge variant="default" className="cursor-pointer transition-colors hover:bg-primary/20">
        <History className="size-3" />
        {label}
      </Badge>
    </button>
  );
}
