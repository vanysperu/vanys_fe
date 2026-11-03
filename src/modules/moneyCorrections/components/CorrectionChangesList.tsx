import { ArrowRight } from 'lucide-react';

import type { CorrectionChange } from '@/modules/moneyCorrections/utils/correctionChanges';

interface CorrectionChangesListProps {
  changes: CorrectionChange[];
}

// Lista "Antes → Después" de una corrección (en vivo al corregir y en el
// historial). min-w-0 + overflow-wrap:anywhere en cada valor: una
// descripción o un n.° de operación largo sin espacios se parte en vez de
// desbordar el diálogo en celular.
export function CorrectionChangesList({ changes }: CorrectionChangesListProps) {
  return (
    <ul className="min-w-0 space-y-1 text-sm">
      {changes.map((change) => (
        <li key={change.field} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{change.label}:</span>
          <span className="min-w-0 text-muted-foreground line-through [overflow-wrap:anywhere]">{change.before}</span>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{change.after}</span>
        </li>
      ))}
    </ul>
  );
}
