import { z } from 'zod';

// Espejo de core/validators/money.validator.ts del backend: el mismo monto se
// acepta o rechaza igual en todos los formularios de dinero (pagos, gastos,
// compras, caja y reposiciones), antes de llegar al servidor.
export const MAX_MONEY_AMOUNT = 99999999.99;

// Más de 2 decimales no existe en soles (la base redondearía en silencio).
// Se mira el número escrito, igual que el backend (money.validator.ts): antes
// se comparaba value * 100 con su redondeo y, en binario, 35.66 * 100 da
// 3565.9999999999995, así que un monto correcto como 35.66 se rechazaba con
// "Máximo 2 decimales" (bug reportado por el usuario).
export const hasAtMostTwoDecimals = (value: number): boolean =>
  Number.isFinite(value) && /^-?\d+(\.\d{1,2})?$/.test(String(value));

export const moneyAmountSchema = (requiredMessage = 'El monto es obligatorio') =>
  z
    .number({ error: requiredMessage })
    .positive('Debe ser mayor a 0')
    .max(MAX_MONEY_AMOUNT, 'El monto es demasiado grande')
    .refine(hasAtMostTwoDecimals, 'Máximo 2 decimales');
