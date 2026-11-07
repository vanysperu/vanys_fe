import { cn } from '@/lib/utils';
import { QUOTATION_STATUS_COLOR, QUOTATION_STATUS_LABEL, type QuotationStatus } from '@/modules/quotations/types/quotation.types';

interface QuotationStatusBadgeProps {
  status: QuotationStatus;
  className?: string;
}

// Etiqueta de color del estado de una cotización. Tiene altura fija, así que
// el texto no puede partirse en dos líneas: se saldría del fondo de color
// ("Diseño en aprobación", reporte de QA).
export function QuotationStatusBadge({ status, className }: QuotationStatusBadgeProps) {
  const color = QUOTATION_STATUS_COLOR[status];

  return (
    <span
      className={cn('inline-flex h-[19px] items-center rounded-md px-2 text-[10px] font-bold whitespace-nowrap', className)}
      style={{ color: color.fg, background: color.bg }}
    >
      {QUOTATION_STATUS_LABEL[status]}
    </span>
  );
}
