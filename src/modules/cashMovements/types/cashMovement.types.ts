import type { PagedListResult } from '@/config/api.types';
import type {
  CashEntryKind,
  CashPeriodStatus,
  CashRowAdjustmentInfo,
  CashRowPeriodStatus,
} from '@/modules/cashClosings/types/cashClosings.types';

export type CashMovementDirection = 'income' | 'expense';

export const CASH_MOVEMENT_DIRECTION_LABEL: Record<CashMovementDirection, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
};

// Espejo de CashMovementListItem (grulla_be: cash_movement/services/find).
// "source" distingue si la fila vive en cash_movement (editable/deshabilitable
// desde este módulo) o es un reflejo de algo registrado en su propia pantalla
// (solo lectura acá): pagos y gastos de cotizaciones, gastos que un
// trabajador pagó con su plata (deuda manual) y reposiciones a trabajadores.
export type CashMovementSource =
  | 'manual'
  | 'quotation_payment'
  | 'quotation_expense'
  | 'employee_debt'
  | 'employee_debt_payment';

export interface CashMovementListItem {
  id: string;
  source: CashMovementSource;
  source_id: number;
  direction: CashMovementDirection;
  category: string | null;
  amount: number;
  description: string | null;
  occurred_at: string;
  quotation_id: number | null;
  purchase_order_id: number | null;
  business_unit_id: number | null;
  // Empresa del movimiento (el Super Administrador la usa para ofrecer las
  // cuentas correctas al corregir uno).
  company_id: number;
  // false = gasto pagado con plata de un trabajador: se muestra para saber
  // quién lo pagó, pero no suma (la empresa no soltó nada; su egreso es la
  // reposición).
  moves_cash: boolean;
  // Cuenta por la que entró/salió (null = efectivo; siempre null en las
  // filas que no mueven caja).
  payment_account_id: number | null;
  payment_account_name: string | null;
  // Solo en gastos pagados con plata de un trabajador.
  paid_by_employee_name: string | null;
  reimbursement_status: 'pending' | 'paid' | null;
  reimbursed_amount: number | null;
  reimbursed_at: string | null;
  // Solo en reposiciones: su monto total (con filtro de tienda o cotización,
  // amount es solo la parte que les corresponde).
  reimbursement_total: number | null;
  // Cuántas correcciones tiene la fila, de cualquier fuente (badge
  // "Corregido" + historial). Cada fuente guarda su historial en
  // money_correction.
  corrections_count: number;
  // Solo en filas quotation_expense que son una COMPRA de una orden: id de la
  // compra. Con él, Caja abre el diálogo de corregir compra en vez del de
  // corregir gasto. Null = gasto manual.
  purchase_id: number | null;
  // Solo en filas employee_debt: origen de la deuda (Caja solo lista las
  // manuales; las de compra se corrigen desde la compra).
  debt_origin: 'manual' | 'purchase' | null;
  created_at: string;
  // Cierre mensual: tipo de fila (movimiento real, 'Valor al cierre' o ajuste de
  // un mes cerrado) y estado del mes de la fila (candado si está cerrado).
  entry_kind: CashEntryKind;
  period_status: CashRowPeriodStatus;
  // Solo en filas entry_kind = 'adjustment' / 'closing_hold'.
  adjustment: CashRowAdjustmentInfo | null;
}

export interface CashAccountSummary {
  // null = efectivo.
  payment_account_id: number | null;
  payment_account_name: string;
  income: number;
  expense: number;
  // Ajustes de meses cerrados registrados en el rango (puede ser negativo).
  adjustments: number;
  net: number;
}

// Totales de TODO lo filtrado (no de la página), solo lo que mueve caja.
export interface CashMovementSummary {
  income: number;
  expense: number;
  adjustments: number;
  net: number;
  by_account: CashAccountSummary[];
}

export interface CashMovementListResult extends PagedListResult<CashMovementListItem> {
  summary: CashMovementSummary;
  // Estado de los meses de la empresa (null si un Super Administrador no
  // eligió empresa).
  cash_period: CashPeriodStatus | null;
}

export interface CashMovementListParams {
  // Solo el Super Administrador: acotar a una empresa (si no, ve todas).
  companyId?: number;
  page?: number;
  limit?: number;
  direction?: CashMovementDirection;
  category?: string;
  source?: CashMovementSource;
  // Id de la cuenta, o "cash" para los movimientos en efectivo.
  paymentAccountId?: number | 'cash';
  quotationId?: number;
  purchaseOrderId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateCashMovementDto {
  direction: CashMovementDirection;
  category: string;
  amount: number;
  description?: string;
  // "YYYY-MM-DD"
  occurred_at: string;
  quotation_id?: number;
  purchase_order_id?: number;
  // Solo la usa un is_system (elige la tienda al no tener una propia); un
  // admin de empresa limitado a su tienda queda forzado server-side.
  business_unit_id?: number;
  // Desde/hacia qué cuenta se movió el dinero (null = efectivo).
  payment_account_id?: number | null;
}

// Corrección de un movimiento manual (PUT /cash-movement/update/:id). Campo
// ausente = se queda como está; null = se limpia. El tipo (ingreso/egreso) no
// se corrige: un movimiento con el sentido equivocado se anula y se registra
// de nuevo.
export interface UpdateCashMovementDto {
  amount?: number;
  category?: string;
  // "YYYY-MM-DD"
  occurred_at?: string;
  payment_account_id?: number | null;
  description?: string | null;
  quotation_id?: number | null;
  purchase_order_id?: number | null;
  reason: string;
}

// Resultado de un mes y el IGV estimado para SUNAT (espejo de grulla_be
// cash_movement/services/shared/period_finance.ts). Lo usan Caja y Cierres.
export interface PeriodFinance {
  period: string; // YYYY-MM
  income: number;
  expenses: number;
  adjustments: number;
  result: number; // ingresos − egresos + ajustes
  igv_sales: number; // IGV de los cobros del mes
  igv_purchases: number; // IGV de las compras con factura del mes
  igv_balance: number; // positivo = a pagar; negativo = saldo a favor
  igv_payable: number;
  net_after_igv: number; // resultado − IGV a pagar
}

// GET /cash-movement/month-summary
export interface MonthSummary extends PeriodFinance {
  is_current: boolean; // mes en curso: "lo que va del mes"
}

export interface MonthSummaryParams {
  period: string;
  companyId?: number;
}
