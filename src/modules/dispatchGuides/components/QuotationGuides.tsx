import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useGuides } from '@/modules/dispatchGuides/hooks/useDispatchGuides';
import { GUIDE_STATUS_LABEL } from '@/modules/dispatchGuides/types/dispatchGuide.types';

interface QuotationGuidesProps {
  quotationId: number;
  // Solo se pide la lista si la persona puede ver guías y la empresa las tiene.
  enabled: boolean;
}

// Guías de remisión ya armadas desde esta cotización (borradores y registradas).
// El botón del camión siempre abre una guía NUEVA: sin esta franja, lo que ya se
// guardó quedaba en Logística y la cotización no lo mostraba.
export function QuotationGuides({ quotationId, enabled }: QuotationGuidesProps) {
  const navigate = useNavigate();
  const { data } = useGuides({ page: 1, limit: 10, quotationId, orderBy: 'created_at', orderDir: 'desc' }, { enabled });
  const guides = data?.data ?? [];
  if (!enabled || guides.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" data-testid="quotation-guides">
      <span className="flex items-center gap-1 text-muted-foreground">
        <FileText className="size-4" aria-hidden /> Guías de remisión:
      </span>
      {guides.map((guide) => (
        <button
          key={guide.id}
          type="button"
          title="Abrir en Logística → Guías de remisión"
          onClick={() => navigate(`/logistica/guias?cotizacion=${quotationId}`)}
          className="rounded-full border px-2.5 py-0.5 text-xs transition-colors hover:bg-accent"
        >
          {guide.number_text ?? `Borrador #${guide.id}`} · {GUIDE_STATUS_LABEL[guide.status]}
        </button>
      ))}
    </div>
  );
}
