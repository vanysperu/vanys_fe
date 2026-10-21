import type { QuotationStatus } from '@/modules/quotations/types/quotation.types';

// Espejo de grulla_be: statistics/types/statistics.types.ts.
export type TrendGranularity = 'day' | 'month';

export interface StatisticsPeriod {
  date_from: string;
  date_to: string;
  previous_from: string;
  previous_to: string;
  granularity: TrendGranularity;
}

export interface KpiValues {
  quoted_amount: number;
  quoted_count: number;
  won_amount: number;
  won_count: number;
  lost_count: number;
  pending_count: number;
  conversion_rate: number | null;
  average_ticket: number | null;
  collected: number;
  other_income: number;
  expenses: number;
  net_cash: number;
  margin_amount: number;
  margin_rate: number | null;
}

export interface TrendPoint {
  bucket: string;
  quoted: number;
  won: number;
  income: number;
  expenses: number;
}

export interface StatusBreakdownItem {
  status: QuotationStatus;
  count: number;
  amount: number;
}

export interface TopClientItem {
  client_id: number;
  name: string;
  amount: number;
  count: number;
}

export interface TopProductItem {
  product_id: number;
  name: string;
  amount: number;
  units: number;
}

export interface TopTechniqueItem {
  technique_id: number;
  name: string;
  units: number;
  quotations: number;
}

export type AgingBucket = '0-30' | '31-60' | '61-90' | '91+';

export interface AgingItem {
  bucket: AgingBucket;
  amount: number;
  count: number;
}

export interface PaymentsByAccountItem {
  label: string;
  amount: number;
  count: number;
}

export interface SellerItem {
  user_id: number | null;
  name: string;
  quoted_count: number;
  quoted_amount: number;
  won_count: number;
  won_amount: number;
  lost_count: number;
  conversion_rate: number | null;
  collected: number;
}

export interface StatisticsOverview {
  period: StatisticsPeriod;
  kpis: { current: KpiValues; previous: KpiValues };
  trend: TrendPoint[];
  status_breakdown: StatusBreakdownItem[];
  top_clients: TopClientItem[];
  top_products: TopProductItem[];
  top_techniques: TopTechniqueItem[];
  receivables_aging: AgingItem[];
  payments_by_account: PaymentsByAccountItem[];
  sellers: SellerItem[];
}

export interface StatisticsParams {
  // YYYY-MM-DD (hora de Lima). Sin fechas = últimos 30 días.
  dateFrom?: string;
  dateTo?: string;
  // Solo se respeta si el usuario no está atado a una tienda.
  businessUnitId?: number;
  // Solo para el Super Administrador.
  companyId?: number;
}
