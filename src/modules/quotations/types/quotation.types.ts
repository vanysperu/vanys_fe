// Espejo de QUOTATION_STATUSES (grulla_be: quotation.model.ts).
export type QuotationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'design_pending'
  | 'in_process'
  | 'cancelled'
  | 'ready'
  | 'delivered'
  | 'finished';

export const QUOTATION_STATUS_LABEL: Record<QuotationStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Vencida',
  design_pending: 'Diseño en aprobación',
  in_process: 'En proceso',
  cancelled: 'Cancelada',
  ready: 'Lista para entregar',
  delivered: 'Entregada',
  finished: 'Finalizada',
};

// Colores exactos del spec de diseño Vanys (README de handoff, tabla de
// chips de estado). "cancelled" no está en la tabla del spec (el flujo
// original no la nombra como columna propia) — se le da el mismo trato
// visual que "rejected" por ser también una salida/excepción.
export const QUOTATION_STATUS_COLOR: Record<QuotationStatus, { fg: string; bg: string }> = {
  pending: { fg: '#9C6511', bg: '#FDF3E2' },
  design_pending: { fg: '#5B3FD6', bg: '#EFEBFF' },
  in_process: { fg: '#1F5FC0', bg: '#E6EEFB' },
  ready: { fg: '#0B7C8A', bg: '#E1F3F5' },
  accepted: { fg: '#1F8A5F', bg: '#E6F5EE' },
  delivered: { fg: '#4B4D58', bg: '#EEEEF1' },
  finished: { fg: '#166534', bg: '#E8F4EA' },
  expired: { fg: '#9A3412', bg: '#FBEDE3' },
  rejected: { fg: '#B4231F', bg: '#FBE9E8' },
  cancelled: { fg: '#B4231F', bg: '#FBE9E8' },
};

// Cadena principal del flujo (columnas del tablero Kanban, en orden) — los
// estados de salida (rejected/expired/cancelled) no son columnas del
// tablero, se disparan con un botón dentro del detalle (ver
// QuotationDetailDialog), igual que en el backend (quotation.service.ts).
export const QUOTATION_MAIN_CHAIN: QuotationStatus[] = [
  'pending',
  'accepted',
  'design_pending',
  'in_process',
  'ready',
  'delivered',
  'finished',
];

// Mismo orden de agrupación que usa la lista por estado: la cadena
// principal primero, las salidas de excepción al final.
export const QUOTATION_STATUS_ORDER: QuotationStatus[] = [
  ...QUOTATION_MAIN_CHAIN,
  'rejected',
  'expired',
  'cancelled',
];

// Espejo EXACTO de ALLOWED_TRANSITIONS (grulla_be: quotation update
// service) — el backend es la fuente real de verdad y vuelve a validar
// esto en cada request, esto solo evita mostrar/arrastrar a un estado que
// de todos modos sería rechazado. Desde cualquier punto de la cadena se
// puede avanzar o retroceder un solo paso, más las salidas de excepción.
// "expired" no aparece como transición manual: vencer una cotización es
// automático según su `valid_until` (job en el backend), nunca un botón que
// el usuario apriete — ver grulla_be: services/jobs/expireQuotations.job.ts.
export const QUOTATION_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['pending', 'design_pending', 'cancelled'],
  design_pending: ['accepted', 'in_process', 'cancelled'],
  in_process: ['design_pending', 'ready', 'cancelled'],
  ready: ['in_process', 'delivered'],
  delivered: ['ready', 'finished'],
  finished: [],
  rejected: [],
  expired: [],
  cancelled: [],
};

// Subconjunto de QUOTATION_TRANSITIONS que cae dentro de la cadena
// principal (sin las salidas de excepción) — es lo único que el tablero
// Kanban permite soltar arrastrando, ya que solo tiene columnas para la
// cadena principal.
export function getKanbanDropTargets(status: QuotationStatus): QuotationStatus[] {
  return QUOTATION_TRANSITIONS[status].filter((next) => QUOTATION_MAIN_CHAIN.includes(next));
}

// Los botones manuales de "Cambiar estado" del detalle SOLO avanzan (o
// salen del flujo: rechazar/cancelar) — retroceder un paso ya no es un
// botón, se hace arrastrando la tarjeta en el tablero Kanban. Antes ambos
// caminos (adelante y atrás) aparecían como botón, y el de "volver" nunca
// desaparecía por más que se avanzara, dando la sensación de un flujo sin
// fin (pedido explícito del usuario tras probarlo).
export function getForwardTransitions(status: QuotationStatus): QuotationStatus[] {
  const index = QUOTATION_MAIN_CHAIN.indexOf(status);
  const backward = index > 0 ? QUOTATION_MAIN_CHAIN[index - 1] : undefined;
  return QUOTATION_TRANSITIONS[status].filter((next) => next !== backward);
}

export interface QuotationClient {
  id: number;
  name: string;
  document_number?: string | null;
}

export interface Quotation {
  id: number;
  company_id: number;
  business_unit_id: number | null;
  client_id: number;
  status: QuotationStatus;
  // `total` es el monto final (con IGV ya aplicado si corresponde) — mismo
  // campo que usa todo el sistema para saldo/pagos. `subtotal` es el monto
  // antes de impuesto, solo para mostrar el desglose.
  subtotal: number;
  total: number;
  total_paid: number;
  includes_delivery: boolean;
  includes_design: boolean;
  includes_igv: boolean;
  notes: string | null;
  valid_until: string | null;
  // Opcional: si el cliente pide que la cotización salga a nombre de otra
  // persona/empresa, esto es lo que se imprime en el PDF — el cliente
  // vinculado (client_id/client) NUNCA cambia, sigue siendo la fuente del
  // historial/pagos.
  billing_name: string | null;
  billing_document_number: string | null;
  // Días hábiles que toma la producción una vez aprobado el diseño —
  // informativo, no dispara ninguna fecha automática.
  production_days: number | null;
  is_deleted: boolean;
  created_at: string;
  client?: QuotationClient;
}

// "stage" es una fila de general_variable (category="production_stage",
// ver Variables Generales) — name = nombre de la etapa, ref1 = color hex,
// ref2 = posición/orden (string numérico, define adyacencia permitida).
export interface QuotationItemStage {
  id: number;
  name: string;
  ref1: string | null;
  ref2: string | null;
}

// Espejo de QuotationItemPricingMode (grulla_be: quotation_item.model.ts).
// Cada modo es una tarifa POR UNIDAD (no el precio de un lote cerrado): el
// subtotal es siempre precio_por_unidad × cantidad. "hundred"/
// "half_thousand"/"thousand" son precios preferenciales por volumen
// precargados en el producto; "custom" es un precio por unidad libre,
// propio de ESTE item de ESTA cotización, que no toca el catálogo.
export type QuotationItemPricingMode = 'unit' | 'hundred' | 'half_thousand' | 'thousand' | 'custom';

export const QUOTATION_ITEM_PRICING_MODE_LABEL: Record<QuotationItemPricingMode, string> = {
  unit: 'Por unidad',
  hundred: 'Por ciento (100)',
  half_thousand: 'Medio millar (500)',
  thousand: 'Por millar (1000)',
  custom: 'Personalizado',
};

export interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id: number;
  technique_id: number | null;
  stage_id: number | null;
  quantity: number;
  pricing_mode: QuotationItemPricingMode;
  unit_price: number;
  subtotal: number;
  product?: {
    id: number;
    name: string;
    price_unit: number | null;
    price_hundred: number | null;
    price_half_thousand: number | null;
    price_thousand: number | null;
  };
  technique?: { id: number; name: string; extra_type: string; extra_value: number } | null;
  stage?: QuotationItemStage | null;
}

export interface QuotationActor {
  id: number;
  name: string;
  paternal_lastname: string;
}

export interface QuotationPayment {
  id: number;
  quotation_id: number;
  amount: number;
  method: string | null;
  paid_at: string;
  notes: string | null;
  operation_number: string | null;
  created_at: string;
  actor?: QuotationActor;
}

export interface QuotationExpense {
  id: number;
  quotation_id: number;
  description: string;
  amount: number;
  category: string | null;
  spent_at: string;
  created_at: string;
  actor?: QuotationActor;
}

export type QuotationEventAction =
  | 'created'
  | 'status_changed'
  | 'item_stage_changed'
  | 'payment_added'
  | 'expense_added'
  | 'updated';

export interface QuotationEvent {
  id: number;
  quotation_id: number;
  action: QuotationEventAction;
  description: string;
  created_at: string;
  actor?: QuotationActor | null;
}

export interface QuotationDetail extends Quotation {
  items: QuotationItem[];
  payments: QuotationPayment[];
  expenses: QuotationExpense[];
  events: QuotationEvent[];
}

export interface CreateQuotationPaymentDto {
  amount: number;
  method?: string | null;
  paid_at: string;
  notes?: string | null;
  operation_number?: string | null;
}

export interface CreateQuotationExpenseDto {
  description: string;
  amount: number;
  category?: string | null;
  spent_at: string;
}

export interface CreateQuotationItemDto {
  product_id: number;
  // Obligatoria (pedido explícito del usuario) — el backend la exige.
  technique_id: number;
  // Solo se manda (y es obligatoria) cuando pricing_mode="custom" — en los
  // modos de catálogo la cantidad la define el lote, el backend la ignora.
  quantity?: number | null;
  pricing_mode: QuotationItemPricingMode;
  custom_price?: number | null;
  // Extra de la técnica cuando pricing_mode="custom" (pedido explícito del
  // usuario: "cuando se le da personalizado debe darte para colocar el
  // precio del producto y de la técnica").
  custom_technique_price?: number | null;
}

export interface CreateQuotationDto {
  company_id: number;
  client_id: number;
  business_unit_id?: number;
  notes?: string;
  valid_until?: string;
  billing_name?: string | null;
  billing_document_number?: string | null;
  production_days?: number | null;
  items: CreateQuotationItemDto[];
  includes_delivery?: boolean;
  includes_design?: boolean;
  includes_igv?: boolean;
}

export interface UpdateQuotationDto {
  notes?: string;
  valid_until?: string;
  billing_name?: string | null;
  billing_document_number?: string | null;
  production_days?: number | null;
  includes_delivery?: boolean;
  includes_design?: boolean;
  includes_igv?: boolean;
}

export interface QuotationListParams {
  page?: number;
  limit?: number;
  status?: QuotationStatus;
  clientId?: number;
}
