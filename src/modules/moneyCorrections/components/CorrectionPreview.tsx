import { CorrectionChangesList } from '@/modules/moneyCorrections/components/CorrectionChangesList';
import type { CorrectionChange } from '@/modules/moneyCorrections/utils/correctionChanges';

interface CorrectionPreviewProps {
  changes: CorrectionChange[];
  // Texto cuando todavía no se cambió nada.
  emptyText?: string;
}

// Recuadro "Antes → Después" en vivo de un diálogo de corrección: lo que va
// a quedar en el historial.
export function CorrectionPreview({ changes, emptyText = 'Todavía no cambiaste nada.' }: CorrectionPreviewProps) {
  return (
    <div className="min-w-0 rounded-lg border bg-muted/40 p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Antes → Después</p>
      {changes.length > 0 ? (
        <CorrectionChangesList changes={changes} />
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
