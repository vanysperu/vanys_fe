// Cada cuánto se recargan solas las listas que se dejan abiertas todo el día
// (Inicio y Recordatorios) — pedido explícito del usuario: "que se refresque
// cada 10 minutos". React Query solo lo hace con la pestaña visible.
export const AUTO_REFRESH_MS = 10 * 60 * 1000;
