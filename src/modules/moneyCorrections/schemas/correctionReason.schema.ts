import { z } from 'zod';

const MIN_REASON_LENGTH = 5;
const MAX_REASON_LENGTH = 500;

// Motivo obligatorio de toda corrección de dinero (mismo rango que el
// backend). Se cuentan caracteres reales ([...texto]) y no unidades UTF-16:
// un emoji vale 1, igual que CHAR_LENGTH en la base y el validator del backend.
export const correctionReasonSchema = z
  .string({ error: 'Indica el motivo de la corrección' })
  .trim()
  .refine((value) => [...value].length >= MIN_REASON_LENGTH, 'El motivo debe tener al menos 5 caracteres')
  .refine((value) => [...value].length <= MAX_REASON_LENGTH, 'Máximo 500 caracteres');
