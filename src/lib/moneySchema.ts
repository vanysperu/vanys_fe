import { z } from 'zod';

// Espejo de core/validators/money.validator.ts del backend: el mismo monto se
// acepta o rechaza igual en todos los formularios de dinero (pagos, gastos,
// compras, caja y reposiciones), antes de llegar al servidor.
export const MAX_MONEY_AMOUNT = 99999999.99;

// Más de 2 decimales no existe en soles (la base redondearía en silencio).
export const hasAtMostTwoDecimals = (value: number): boolean => Math.round(value * 100) === value * 100;

export const moneyAmountSchema = (requiredMessage = 'El monto es obligatorio') =>
  z
    .number({ error: requiredMessage })
    .positive('Debe ser mayor a 0')
    .max(MAX_MONEY_AMOUNT, 'El monto es demasiado grande')
    .refine(hasAtMostTwoDecimals, 'Máximo 2 decimales');
