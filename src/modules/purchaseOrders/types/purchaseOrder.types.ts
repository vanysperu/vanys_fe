export type PurchaseOrderStatus = 'pending' | 'purchased';

export const PURCHASE_ORDER_STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  pending: 'Pendiente',
  purchased: 'Comprado',
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
}
