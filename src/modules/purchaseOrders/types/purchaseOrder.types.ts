import { QUOTATION_ACTIVE_STATUSES } from '@/modules/quotations/types/quotation.types';

// Solo una orden de una cotización aceptada o en curso admite registrar
// compras o cambiar sus productos (el backend responde 409
// QUOTATION_NOT_ACTIVE si no): en otra, las acciones ni se muestran.
export const isPurchaseOrderQuotationActive = (order: Pick<PurchaseOrder, 'quotation'>): boolean =>
  QUOTATION_ACTIVE_STATUSES.some((status) => status === order.quotation?.status);

export type PurchaseOrderStatus = 'pending' | 'purchased';

// "purchased" = TODOS los items quedaron resueltos (comprados o marcados
// "ya no es necesario"), no necesariamente que se haya comprado todo — la
// etiqueta "Finalizada" (en vez de "Comprado") evita la contradicción visual
// de una orden "Comprado" con un item tachado en 0/100 (bug reportado por
// QA: "genera confusión sobre el estado real de la compra").
export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pending: 'Pendiente',
  purchased: 'Finalizada',
};

// Estado por producto dentro de una orden (no toda la orden) — una orden
// con varios productos puede tener unos comprados, otros pendientes, y
// otros marcados "ya no es necesario" sin bloquear el cierre de la orden.
export type PurchaseOrderItemStatus = 'pending' | 'purchased' | 'not_needed';

export const PURCHASE_ORDER_ITEM_STATUS_LABEL: Record<PurchaseOrderItemStatus, string> = {
  pending: 'Pendiente',
  purchased: 'Comprado',
  not_needed: 'Ya no es necesario',
};

export interface PurchaseOrderActor {
  id: number;
  name: string;
  paternal_lastname: string;
}

// Una compra parcial de un item: cuánto se consiguió y por cuánto — cada
// una genera un gasto real de la cotización (toda compra ES un gasto).
export interface PurchaseOrderItemPurchase {
  id: number;
  quantity: number;
  amount: number;
  funding_source: FundingSource;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  quotation_item_id: number;
  quantity: number;
  status: PurchaseOrderItemStatus;
  quotationItem?: {
    id: number;
    product?: { id: number; name: string };
  };
  purchases: PurchaseOrderItemPurchase[];
}

export type FundingSource = 'company' | 'employee';

export const FUNDING_SOURCE_LABEL: Record<FundingSource, string> = {
  company: 'Plata de la empresa',
  employee: 'Plata propia (me deben)',
};

export interface CreatePurchaseOrderItemPurchaseDto {
  quantity: number;
  amount: number;
  notes?: string;
  funding_source: FundingSource;
  // Cuenta de la empresa desde la que se pagó (null = efectivo). Solo con
  // funding_source="company": con plata del trabajador no sale de ninguna.
  payment_account_id?: number | null;
  // true = la persona ya confirmó que quiere comprar por encima de lo pedido.
  allow_exceed?: boolean;
}

// Código y detalle con los que el backend rechaza una compra que supera lo
// pedido sin confirmación (grulla_be: purchase_order.controller.ts).
export const PURCHASE_EXCEEDS_REMAINING_CODE = 'PURCHASE_EXCEEDS_REMAINING';

export interface PurchaseExceedsRemainingDetail {
  ordered: number;
  already_purchased: number;
  requested: number;
}

export interface PurchaseOrder {
  id: number;
  company_id: number;
  quotation_id: number;
  assigned_to: number;
  status: PurchaseOrderStatus;
  notes: string | null;
  purchased_at: string | null;
  created_at: string;
  quotation?: { id: number; status: string; client?: { id: number; name: string } };
  assignee?: PurchaseOrderActor;
  creator?: PurchaseOrderActor;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderItemDto {
  quotation_item_id: number;
  quantity: number;
}

export interface CreatePurchaseOrderDto {
  company_id: number;
  quotation_id: number;
  assigned_to: number;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface PurchaseOrderListParams {
  // Solo tiene efecto para el Super Administrador: limita el listado a esa
  // empresa (ej. los selectores de un formulario, una vez elegida la empresa,
  // para no mezclar información entre empresas).
  companyId?: number;
  page?: number;
  limit?: number;
  status?: PurchaseOrderStatus;
  assignedToMe?: boolean;
  quotationId?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // Filtros por columna de la tabla (buscador en el header de DataTable).
  clientName?: string;
  assigneeName?: string;
  // Rango de fecha de creación (YYYY-MM-DD).
  dateFrom?: string;
  dateTo?: string;
}
