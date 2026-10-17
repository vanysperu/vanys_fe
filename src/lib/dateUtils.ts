// Fecha de HOY en la zona horaria del navegador, como "YYYY-MM-DD" (el
// formato de las columnas DATEONLY del backend).
//
// No usar `new Date().toISOString().slice(0, 10)` para esto: toISOString
// devuelve la fecha en UTC, y desde Lima (UTC-5) después de las 7 p. m. ya
// es el día siguiente — un pago registrado a las 8 p. m. quedaba con fecha
// de mañana por defecto.
export function todayLocalDateString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
