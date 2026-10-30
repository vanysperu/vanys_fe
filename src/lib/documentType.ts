import type { z } from 'zod';

// Reglas EXACTAS por tipo de documento — mismo catálogo que expone el
// backend (general_variable, category="document_type") y mismo criterio
// que valida grulla_be (core/validators/documentType.validator.ts).
// Compartido entre Usuarios y Clientes (antes vivía duplicado en
// createUser.schema.ts y UsersListPage.tsx) — cualquier formulario nuevo
// que pida un documento de identidad reutiliza esto.
export const DOCUMENT_TYPE_DNI = 1;
export const DOCUMENT_TYPE_PASSPORT = 2;
export const DOCUMENT_TYPE_CE = 3;
export const DOCUMENT_TYPE_RUC = 6;

export interface DocumentTypeRule {
  // Exacto cuando min === max (DNI/RUC); rango cuando difieren (CE/PAS,
  // documentos extranjeros cuyo largo real varía por país).
  min: number;
  max: number;
  onlyDigits: boolean;
  label: string;
}

export const DOCUMENT_TYPE_RULES: Record<number, DocumentTypeRule> = {
  [DOCUMENT_TYPE_DNI]: { min: 8, max: 8, onlyDigits: true, label: 'El DNI debe tener exactamente 8 dígitos' },
  [DOCUMENT_TYPE_RUC]: { min: 11, max: 11, onlyDigits: true, label: 'El RUC debe tener exactamente 11 dígitos' },
  [DOCUMENT_TYPE_CE]: { min: 9, max: 12, onlyDigits: false, label: 'El CE debe tener entre 9 y 12 caracteres' },
  [DOCUMENT_TYPE_PASSPORT]: { min: 6, max: 9, onlyDigits: false, label: 'El pasaporte debe tener entre 6 y 9 caracteres' },
};

// Para usar dentro de un `.superRefine((data, ctx) => ...)` de Zod: agrega
// el issue correspondiente en `path` si el documento no cumple el
// largo/formato exacto de su tipo. No hace nada si el tipo no está elegido
// todavía (otro validador del propio schema ya exige elegirlo).
export function addDocumentNumberIssues(
  ctx: z.RefinementCtx,
  documentType: number | undefined,
  documentNumber: string,
  path: (string | number)[],
): void {
  if (!documentType) return;
  const rule = DOCUMENT_TYPE_RULES[documentType];
  if (!rule) return;

  if (documentNumber.length < rule.min || documentNumber.length > rule.max) {
    ctx.addIssue({ code: 'custom', message: rule.label, path });
    return;
  }
  if (rule.onlyDigits && !/^\d+$/.test(documentNumber)) {
    ctx.addIssue({ code: 'custom', message: 'Debe contener solo dígitos', path });
  }
}

// Filtro en vivo del input (mismo criterio que ya usan los demás campos
// restringidos — ver lib/inputRestrictions.ts): DNI/RUC son siempre
// numéricos y de largo fijo; CE/Pasaporte pueden traer letras (documentos
// de extranjería), así que solo se les tope el largo máximo.
export function documentNumberMaxLength(documentType: number | undefined): number {
  if (!documentType) return 12;
  return DOCUMENT_TYPE_RULES[documentType]?.max ?? 12;
}

export function documentNumberOnlyDigits(documentType: number | undefined): boolean {
  if (!documentType) return false;
  return DOCUMENT_TYPE_RULES[documentType]?.onlyDigits ?? false;
}
