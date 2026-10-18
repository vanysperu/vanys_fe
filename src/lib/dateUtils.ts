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

// "YYYY-MM-DD" -> Date a medianoche LOCAL (new Date("YYYY-MM-DD") la
// interpreta como medianoche UTC, que en Lima es el día anterior).
export function parseLocalIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}
