import type { PagedListResult } from '@/config/api.types';
import type { PeriodFinance } from '@/modules/cashMovements/types/cashMovement.types';
import type { MoneyCorrectionSource } from '@/modules/moneyCorrections/types/moneyCorrection.types';

// Espejo de grulla_be: api/modules/cash_closing/types/cash_closing.types.ts.
// Montos en soles (number); fechas 'YYYY-MM-DD' y periodos 'YYYY-MM' (Lima).

export type CashDirection = 'income' | 'expense';

export type CashPeriodListStatus = 'open' | 'closed' | 'reopened';

// Estado del mes de UNA fila de Caja.
export type CashRowPeriodStatus = 'no_ledger' | 'pre_ledger' | 'open' | 'reopened' | 'closed';

export type CashEntryKind = 'movement' | 'closing_hold' | 'adjustment';

export type CashAdjustmentAction = 'correction' | 'annul' | 'restore';

export type CashAdjustmentLeg = 'hold' | 'posting';

export type CashPeriodEventAction = 'opening_set' | 'close' | 'reclose' | 'reopen' | 'recalculate';

export interface DateTimeParts {
  date: string;
  time: string;
}

// GET /cash-closing/status (también viene como `cash_period` en el listado de Caja).
export interface CashPeriodStatus {
  started: boolean;
  start_period: string | null;
  start_date: string | null;
  first_open_date: string | null;
  closed_periods: string[];
  reopened_periods: string[];
  today: string;
}

// `transfers`: transferencias entre cuentas (neto con signo). De la empresa
// entera siempre suma 0; por cuenta, no. Opcional: las fotos de eventos
// guardadas antes de las transferencias no lo traen (se lee como 0).
export interface CashPeriodTotals {
  opening: number;
  income: number;
  expense: number;
  transfers?: number;
  adjustments: number;
  closing: number;
}

// closing = opening + income − expense + transfers + adjustments.
export interface CashPeriodAccountBalance {
  account_key: number;
  payment_account_id: number | null;
  account_name: string;
  opening: number;
  income: number;
  expense: number;
  transfers?: number;
  adjustments: number;
  closing: number;
}

export interface CashClosingIssue {
  code: string;
  message: string;
}

export interface CashClosingListItem {
  period: string;
  label: string;
  status: CashPeriodListStatus;
  closable: boolean;
  blocked_reason: string | null;
  is_provisional: boolean;
  totals: CashPeriodTotals | null;
  close_count: number;
  closed_by_name: string | null;
  closed_at: DateTimeParts | null;
  reopened_by_name: string | null;
  reopened_at: DateTimeParts | null;
  reopen_reason: string | null;
  // Resultado del mes, IGV estimado y neto después del IGV.
  finance: PeriodFinance | null;
}

export interface CashPeriodDetail extends CashClosingListItem {
  period_start: string;
  period_end: string;
  is_preview: boolean;
  close_notes: string | null;
  balances: CashPeriodAccountBalance[];
  blockers: CashClosingIssue[];
  warnings: CashClosingIssue[];
  counts: { adjustments_posted: number; adjustments_affecting: number };
}

export type CashClosingListResult = PagedListResult<CashClosingListItem>;

export interface CashPeriodAdjustmentItem {
  id: number;
  money_correction_id: number;
  source_type: MoneyCorrectionSource;
  source_id: number;
  leg: CashAdjustmentLeg;
  action: CashAdjustmentAction;
  affected_period: string;
  affected_period_label: string;
  entry_date: string;
  direction: CashDirection;
  amount: number;
  net_effect: number;
  payment_account_id: number | null;
  payment_account_name: string;
  business_unit_id: number | null;
  quotation_id: number | null;
  purchase_order_id: number | null;
  reason: string;
  created_by_name: string | null;
  created_at: DateTimeParts;
}

export type CashAdjustmentsType = 'posted' | 'affecting';

export interface CashPeriodOpeningSnapshot {
  start_period: string;
  start_date: string;
  notes: string | null;
  openings: {
    account_key: number;
    payment_account_id: number | null;
    account_name: string;
    amount: number;
    history_amount: number | null;
  }[];
}

export interface CashPeriodSnapshot {
  period: string;
  totals: CashPeriodTotals;
  balances: CashPeriodAccountBalance[];
}

export type CashPeriodEventSnapshot = CashPeriodSnapshot | CashPeriodOpeningSnapshot;

export interface CashPeriodEventItem {
  id: number;
  period: string | null;
  action: CashPeriodEventAction;
  reason: string | null;
  snapshot: CashPeriodEventSnapshot | null;
  previous_snapshot: CashPeriodEventSnapshot | null;
  created_by: number;
  created_by_name: string | null;
  created_at: DateTimeParts;
}

export interface CashBalanceAccount {
  account_key: number;
  payment_account_id: number | null;
  name: string;
  base_balance: number;
  income: number;
  expense: number;
  // Transferencias entre cuentas desde la base (neto con signo).
  transfers: number;
  adjustments: number;
  current_balance: number;
}

export interface CashBalancesResponse {
  started: boolean;
  as_of: string;
  base_period: string | null;
  base_label: string | null;
  provisional_note: string | null;
  accounts: CashBalanceAccount[];
  totals: Omit<CashBalanceAccount, 'account_key' | 'payment_account_id' | 'name'>;
}

export interface CashOpeningAccount {
  account_key: number;
  payment_account_id: number | null;
  name: string;
  active: boolean;
  amount: number | null;
  history_amount: number;
}

export interface CashOpeningResponse {
  started: boolean;
  start_period: string;
  start_date: string;
  notes: string | null;
  editable: boolean;
  start_period_editable: boolean;
  accounts: CashOpeningAccount[];
}

// Resumen del ajuste en una fila de Caja (item.adjustment).
export interface CashRowAdjustmentInfo {
  correction_id: number;
  affected_period: string;
  posted_date: string;
  action: CashAdjustmentAction;
  previous_amount: number | null;
  new_amount: number | null;
  reason: string;
  created_by_name: string | null;
}

// Anular/restaurar un movimiento: el motivo solo se manda cuando es de un mes
// cerrado (se registra como ajuste).
export interface ReasonedToggleInput {
  id: number;
  reason?: string;
}

// --- Parámetros / DTOs ------------------------------------------------------

// Solo el Super Administrador manda companyId (GET) / company_id (PUT).
export interface CashClosingsCompanyParams {
  companyId?: number;
}

export interface CashClosingsListParams extends CashClosingsCompanyParams {
  page?: number;
  limit?: number;
}

export interface CashPeriodAdjustmentsParams extends CashClosingsCompanyParams {
  period: string;
  type: CashAdjustmentsType;
  page?: number;
  limit?: number;
}

export interface CashPeriodEventsParams extends CashClosingsCompanyParams {
  period: string;
  page?: number;
  limit?: number;
}

export interface SetCashOpeningDto {
  company_id?: number;
  start_period: string;
  openings: { payment_account_id: number | null; amount: number }[];
  notes?: string | null;
}

export interface ClosePeriodDto {
  company_id?: number;
  notes?: string;
}

export interface ReopenPeriodDto {
  company_id?: number;
  reason: string;
}
