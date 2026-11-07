import { formatDate } from '@/lib/dateUtils';
import type {
  AllocationSnapshot,
  MoneyCorrectionValue,
  MoneyCorrectionValues,
} from '@/modules/moneyCorrections/types/moneyCorrection.types';

// Registro único de los campos corregibles de TODAS las fuentes de dinero:
// etiqueta + cómo se muestra cada valor. Lo usan el "Antes → Después" en vivo
// de cada diálogo de corrección y el historial, así ambos se leen igual.
// Las claves son las del backend (MONEY_CORRECTION_VALUE_KEYS en
// grulla_be: money_correction/services/find/money_correction.service.ts).

// Catálogos que no vienen dentro de la foto (se resuelven al mostrar).
export interface CorrectionLookups {
  categoryName?: (code: string) => string;
  methodName?: (code: string) => string;
}

interface CorrectionFieldDefinition {
  label: string;
  format: (values: MoneyCorrectionValues, field: string, lookups: CorrectionLookups) => string;
}

export interface CorrectionChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

const EMPTY = '—';

const FUNDING_SOURCE_TEXT: Record<string, string> = {
  company: 'Plata de la empresa',
  employee: 'Plata de un trabajador',
};

const DEBT_STATUS_TEXT: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  cancelled: 'Anulada',
};

export function formatMoney(amount: number): string {
  return 'S/ ' + amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const asText = (value: MoneyCorrectionValue | undefined): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null;

const asNumber = (value: MoneyCorrectionValue | undefined): number | null => {
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isAllocationList = (value: MoneyCorrectionValue | undefined): value is AllocationSnapshot[] => Array.isArray(value);

// NaN / vacío = el input todavía está en blanco mientras se escribe.
const formatMoneyField: CorrectionFieldDefinition['format'] = (values, field) => {
  const amount = asNumber(values[field]);
  return amount === null ? EMPTY : formatMoney(amount);
};

const formatDateField: CorrectionFieldDefinition['format'] = (values, field) => {
  const text = asText(values[field]);
  if (!text) return EMPTY;
  return formatDate(text, text);
};

const formatTextField =
  (emptyText: string): CorrectionFieldDefinition['format'] =>
  (values, field) =>
    asText(values[field]) ?? emptyText;

const formatQuantityField: CorrectionFieldDefinition['format'] = (values, field) => {
  const quantity = asNumber(values[field]);
  return quantity === null ? EMPTY : `${quantity} u.`;
};

const formatCodeField =
  (prefix: string): CorrectionFieldDefinition['format'] =>
  (values, field) => {
    const id = asNumber(values[field]);
    return id === null ? 'Ninguna' : `${prefix}-${String(id).padStart(4, '0')}`;
  };

// Un id con su nombre guardado del momento al lado (ej. payment_account_id +
// payment_account_name): se muestra el nombre; sin nombre, "#id".
const formatNamedReference =
  (nameKey: string, fallbackLabel: string, nullText: string): CorrectionFieldDefinition['format'] =>
  (values, field) => {
    const id = asNumber(values[field]);
    if (id === null) return nullText;
    return asText(values[nameKey]) ?? `${fallbackLabel} #${id}`;
  };

const formatCategoryField: CorrectionFieldDefinition['format'] = (values, field, lookups) => {
  const code = asText(values[field]);
  if (!code) return EMPTY;
  return lookups.categoryName?.(code) ?? code;
};

const formatMethodField: CorrectionFieldDefinition['format'] = (values, field, lookups) => {
  const code = asText(values[field]);
  if (!code) return EMPTY;
  return lookups.methodName?.(code) ?? code;
};

const formatMappedField =
  (labels: Record<string, string>): CorrectionFieldDefinition['format'] =>
  (values, field) => {
    const code = asText(values[field]);
    if (!code) return EMPTY;
    return labels[code] ?? code;
  };

const formatAllocationsField: CorrectionFieldDefinition['format'] = (values, field) => {
  const allocations = values[field];
  if (!isAllocationList(allocations) || allocations.length === 0) return 'Sin deudas cubiertas';
  return allocations.map((allocation) => `Deuda #${allocation.employee_debt_id}: ${formatMoney(allocation.amount)}`).join(', ');
};

// En el orden en que se muestran. Las claves *_name no son filas propias:
// las usa el campo de su id para mostrar el nombre.
const CORRECTION_FIELDS: readonly (readonly [string, CorrectionFieldDefinition])[] = [
  ['amount', { label: 'Monto', format: formatMoneyField }],
  ['quantity', { label: 'Cantidad', format: formatQuantityField }],
  ['invoice_status', { label: 'Factura', format: formatTextField(EMPTY) }],
  ['occurred_at', { label: 'Fecha', format: formatDateField }],
  ['paid_at', { label: 'Fecha de pago', format: formatDateField }],
  ['spent_at', { label: 'Fecha del gasto', format: formatDateField }],
  ['incurred_at', { label: 'Fecha', format: formatDateField }],
  ['is_deleted', { label: 'Estado', format: formatMappedField({ '0': 'Vigente', '1': 'Anulado' }) }],
  ['category', { label: 'Categoría', format: formatCategoryField }],
  ['method', { label: 'Medio de pago', format: formatMethodField }],
  ['funding_source', { label: 'Pagado con', format: formatMappedField(FUNDING_SOURCE_TEXT) }],
  ['paid_by_user_id', { label: 'Trabajador que pagó', format: formatNamedReference('paid_by_user_name', 'Usuario', 'Ninguno') }],
  ['user_id', { label: 'Trabajador', format: formatNamedReference('user_name', 'Usuario', 'Ninguno') }],
  ['payment_account_id', { label: 'Cuenta', format: formatNamedReference('payment_account_name', 'Cuenta', 'Efectivo') }],
  ['business_unit_id', { label: 'Tienda', format: formatNamedReference('business_unit_name', 'Tienda', 'Sin tienda') }],
  ['description', { label: 'Descripción', format: formatTextField('(vacía)') }],
  ['operation_number', { label: 'N.° de operación', format: formatTextField('(vacío)') }],
  ['notes', { label: 'Notas', format: formatTextField('(vacías)') }],
  ['quotation_id', { label: 'Cotización', format: formatCodeField('COT') }],
  ['purchase_order_id', { label: 'Orden de compra', format: formatCodeField('OC') }],
  ['debt_amount', { label: 'Deuda con el trabajador', format: formatMoneyField }],
  ['debt_status', { label: 'Estado de la deuda', format: formatMappedField(DEBT_STATUS_TEXT) }],
  ['allocations', { label: 'Deudas cubiertas', format: formatAllocationsField }],
];

export const CORRECTION_FIELD_KEYS: readonly string[] = CORRECTION_FIELDS.map(([field]) => field);

// Arma la lista "Antes → Después" solo con los campos presentes en alguna de
// las dos fotos (el backend guarda únicamente lo que cambió).
export function buildCorrectionChanges(
  previous: MoneyCorrectionValues,
  next: MoneyCorrectionValues,
  lookups: CorrectionLookups = {},
): CorrectionChange[] {
  return CORRECTION_FIELDS.filter(([field]) => field in previous || field in next).map(([field, definition]) => ({
    field,
    label: definition.label,
    before: definition.format(previous, field, lookups),
    after: definition.format(next, field, lookups),
  }));
}

// Resumen en una línea (para el texto del ConfirmDialog).
export function describeCorrectionChanges(changes: CorrectionChange[]): string {
  return changes.map((change) => `${change.label}: ${change.before} → ${change.after}`).join(' · ');
}

// Id → clave con su nombre guardado del momento.
const NAME_KEY_OF: Partial<Record<string, string>> = {
  payment_account_id: 'payment_account_name',
  paid_by_user_id: 'paid_by_user_name',
  user_id: 'user_name',
  business_unit_id: 'business_unit_name',
};

// Para el "Antes → Después" en vivo de un diálogo: dadas las fotos completas
// (antes y lo que hay en el formulario) y los campos que se comparan,
// devuelve solo lo que cambió, en el mismo formato que el historial. Los
// valores tienen que venir normalizados (ej. texto vacío = null) para no
// mostrar falsos cambios.
export function pickChangedValues(
  before: MoneyCorrectionValues,
  after: MoneyCorrectionValues,
  fields: readonly string[],
): { previous: MoneyCorrectionValues; next: MoneyCorrectionValues; changedFields: string[] } {
  const changedFields = fields.filter((field) => !sameValue(before[field], after[field]));
  // Con un id cambiado viaja también su nombre (si el caller lo puso en la foto).
  const pick = (values: MoneyCorrectionValues) =>
    changedFields.reduce<MoneyCorrectionValues>((picked, field) => {
      const nameKey = NAME_KEY_OF[field];
      const withField = { ...picked, [field]: values[field] };
      return nameKey && nameKey in values ? { ...withField, [nameKey]: values[nameKey] } : withField;
    }, {});
  return { previous: pick(before), next: pick(after), changedFields };
}

function sameValue(left: MoneyCorrectionValue | undefined, right: MoneyCorrectionValue | undefined): boolean {
  if (isAllocationList(left) || isAllocationList(right)) return JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
  return (left ?? null) === (right ?? null);
}
