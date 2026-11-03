import type { PagedListResult } from '@/config/api.types';

// Espejo de grulla_be: api/modules/money_correction/types/money_correction.types.ts.
// Mismos nombres que la columna `source` de Caja. Una compra de orden se
// registra como 'quotation_expense' (su gasto).
export type MoneyCorrectionSource =
  | 'manual'
  | 'quotation_payment'
  | 'quotation_expense'
  | 'employee_debt'
  | 'employee_debt_payment';

export type MoneyCorrectionKind = 'correction' | 'adjustment';

// Cuánto de una reposición cubrió cada deuda (foto antes/después).
export interface AllocationSnapshot {
  employee_debt_id: number;
  amount: number;
}

export type MoneyCorrectionValue = string | number | null | AllocationSnapshot[];

// Foto de una corrección: solo los campos que cambiaron (más datos
// derivados guardados como texto del momento: nombre de la cuenta, del
// trabajador, etc.). Un campo ausente = no cambió.
export type MoneyCorrectionValues = Partial<Record<string, MoneyCorrectionValue>>;

// Resumen de la diferencia que un ajuste registró en el mes abierto (lo calcula
// el backend a partir de las patas del ajuste; ausente en correcciones simples).
export interface MoneyCorrectionAdjustmentSummary {
  affected_period: string;
  posted_date: string;
  // Efecto neto en el saldo (puede ser negativo) y cuenta afectada.
  net_effect: number;
  account_name: string | null;
}

export interface MoneyCorrection {
  id: number;
  source_type: MoneyCorrectionSource;
  source_id: number;
  kind: MoneyCorrectionKind;
  previous_values: MoneyCorrectionValues;
  new_values: MoneyCorrectionValues;
  reason: string;
  // Solo cuando kind = 'adjustment'.
  adjustment?: MoneyCorrectionAdjustmentSummary | null;
  created_by: number;
  created_by_name: string | null;
  created_at: string;
  // Fecha (YYYY-MM-DD) y hora (HH:mm) de Lima, ya separadas por el backend.
  created_date: string;
  created_time: string;
}

export interface MoneyCorrectionsParams {
  page?: number;
  limit?: number;
}

export type MoneyCorrectionsResult = PagedListResult<MoneyCorrection>;
