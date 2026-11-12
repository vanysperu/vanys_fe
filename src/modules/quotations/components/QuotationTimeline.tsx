import { ArrowRightLeft, CircleDollarSign, Eye, FilePlus, Link2, Mail, MessageCircle, Pencil, Receipt, RotateCcw, ShoppingCart, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { QuotationEvent, QuotationEventAction } from '@/modules/quotations/types/quotation.types';
import { formatDateTime } from '@/lib/dateUtils';

// Un color + ícono + etiqueta por tipo de evento — antes todo el timeline
// era gris parejo (mismo círculo, mismo ícono de lápiz de respaldo) y no
// se distinguía nada de un vistazo (pedido explícito del usuario: "más
// bonito, con colores que diferencien, tags").
const EVENT_STYLE: Record<QuotationEventAction, { icon: LucideIcon; tag: string; fg: string; bg: string }> = {
  created: { icon: FilePlus, tag: 'Creación', fg: '#5B3FD6', bg: '#EFEBFF' },
  status_changed: { icon: ArrowRightLeft, fg: '#1F5FC0', bg: '#E6EEFB', tag: 'Estado' },
  item_stage_changed: { icon: Workflow, fg: '#9C6511', bg: '#FDF3E2', tag: 'Producción' },
  payment_added: { icon: CircleDollarSign, fg: '#1F8A5F', bg: '#E6F5EE', tag: 'Pago' },
  payment_updated: { icon: CircleDollarSign, fg: '#1F8A5F', bg: '#E6F5EE', tag: 'Pago corregido' },
  payment_disabled: { icon: CircleDollarSign, fg: '#4B4D58', bg: '#EEEEF1', tag: 'Pago anulado' },
  expense_added: { icon: Receipt, fg: '#B4231F', bg: '#FBE9E8', tag: 'Gasto' },
  expense_updated: { icon: Receipt, fg: '#B4231F', bg: '#FBE9E8', tag: 'Gasto corregido' },
  expense_disabled: { icon: Receipt, fg: '#4B4D58', bg: '#EEEEF1', tag: 'Gasto anulado' },
  expense_restored: { icon: Receipt, fg: '#B4231F', bg: '#FBE9E8', tag: 'Gasto restaurado' },
  purchase_updated: { icon: ShoppingCart, fg: '#B4231F', bg: '#FBE9E8', tag: 'Compra corregida' },
  purchase_disabled: { icon: ShoppingCart, fg: '#4B4D58', bg: '#EEEEF1', tag: 'Compra anulada' },
  quotation_reset: { icon: RotateCcw, fg: '#B4231F', bg: '#FBE9E8', tag: 'Reseteada' },
  updated: { icon: Pencil, fg: '#4B4D58', bg: '#EEEEF1', tag: 'Edición' },
  shared_whatsapp: { icon: MessageCircle, fg: '#1F8A5F', bg: '#E6F5EE', tag: 'WhatsApp' },
  shared_email: { icon: Mail, fg: '#1F5FC0', bg: '#E6EEFB', tag: 'Correo' },
  public_link_changed: { icon: Link2, fg: '#4B4D58', bg: '#EEEEF1', tag: 'Enlace' },
  viewed_by_client: { icon: Eye, fg: '#5B3FD6', bg: '#EFEBFF', tag: 'Vista del cliente' },
};

// "expense_added" generado por una compra usa el mismo tag "Gasto" — si en
// el futuro se agrega un action dedicado a compras, se suma acá.
const PURCHASE_ICON = ShoppingCart;

interface QuotationTimelineProps {
  events: QuotationEvent[];
}

// El backend ya entrega los eventos ordenados del más reciente al más
// antiguo (quotation.service.ts -> getQuotationById, order created_at DESC).
export function QuotationTimeline({ events }: QuotationTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay actividad registrada.</p>;
  }

  return (
    <div className="relative space-y-3 pl-1">
      <div className="absolute top-2 bottom-2 left-[15px] w-px bg-border" />
      {events.map((event) => {
        const style = EVENT_STYLE[event.action] ?? EVENT_STYLE.updated;
        const isPurchase = event.action === 'expense_added' && event.description.startsWith('Compra:');
        const Icon = isPurchase ? PURCHASE_ICON : style.icon;

        return (
          <div key={event.id} className="relative flex gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/40">
            <div
              className="relative z-10 flex size-7.5 shrink-0 items-center justify-center rounded-full border-2 border-card shadow-sm"
              style={{ background: style.bg, color: style.fg }}
            >
              <Icon className="size-3.5" />
            </div>
            <div className="flex-1 space-y-0.5 pb-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className="inline-flex h-[18px] items-center rounded-md px-1.5 text-[10px] font-bold"
                  style={{ color: style.fg, background: style.bg }}
                >
                  {isPurchase ? 'Compra' : style.tag}
                </span>
                <p className="text-sm">{event.description}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.created_at)}
                {event.actor ? ` · ${event.actor.name} ${event.actor.paternal_lastname}` : ' · Sistema'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
