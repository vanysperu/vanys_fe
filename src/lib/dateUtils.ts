// Fecha de HOY en la zona horaria del navegador, como "YYYY-MM-DD" (el
// formato de las columnas DATEONLY del backend).
//
// No usar `new Date().toISOString().slice(0, 10)` para esto: toISOString
// devuelve la fecha en UTC, y desde Lima (UTC-5) después de las 7 p. m. ya
// es el día siguiente — un pago registrado a las 8 p. m. quedaba con fecha
// de mañana por defecto.
export function todayLocalDateString(): string {
  return toLocalIsoDate(new Date());
}

// Date (día local) -> "YYYY-MM-DD", sin pasar por UTC.
export function toLocalIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Fechas en pantalla: SIEMPRE DD/MM/YYYY (pedido explícito del usuario). Antes
// cada pantalla formateaba a su manera ("5/11/2026" con es-PE, "2026-11-05"
// crudo de la API...). Usar estos helpers en vez de toLocaleDateString.
// ---------------------------------------------------------------------------

const BUSINESS_TIME_ZONE = 'America/Lima';

// Instante (ISO con hora o Date) -> partes del día y hora en Lima.
const limaPartsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const limaParts = (instant: Date) => {
  const parts = limaPartsFormatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('day')}/${get('month')}/${get('year')}`, time: `${get('hour')}:${get('minute')}` };
};

const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" (día calendario, sin zona), un ISO con hora (instante, se pasa
// a hora de Lima) o un Date -> "DD/MM/YYYY". Vacío o inválido -> fallback.
export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  if (typeof value === 'string') {
    const dateOnly = DATE_ONLY_REGEX.exec(value.trim());
    if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`;
  }
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return fallback;
  return limaParts(instant).date;
}

// Instante -> "DD/MM/YYYY HH:mm" (hora de Lima). También acepta las partes
// { date: 'YYYY-MM-DD', time: 'HH:mm' } que ya manda el backend.
export function formatDateTime(
  value: string | Date | { date: string; time: string } | null | undefined,
  fallback = '—',
): string {
  if (!value) return fallback;
  if (typeof value === 'object' && !(value instanceof Date)) return `${formatDate(value.date, fallback)} ${value.time}`;
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return fallback;
  const { date, time } = limaParts(instant);
  return `${date} ${time}`;
}

// "YYYY-MM-DD" -> Date a medianoche LOCAL (new Date("YYYY-MM-DD") la
// interpreta como medianoche UTC, que en Lima es el día anterior).
export function parseLocalIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
