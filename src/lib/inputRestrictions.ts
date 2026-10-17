import type { ChangeHandler, UseFormRegisterReturn } from 'react-hook-form';

// No basta con mostrar el error al enviar (pedido explícito del usuario:
// "claro salió el mensaje pero debe limitar los input también") — estos
// filtros bloquean en vivo, mientras se escribe, los caracteres que el
// campo nunca debería aceptar (mismas reglas que ya validan Zod/backend:
// NAME_REGEX letras, PHONE_REGEX dígitos).
type InputFilter = (raw: string) => string;

export const lettersFilter =
  (maxLength?: number): InputFilter =>
  (raw) => {
    const letters = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'.-]/g, '');
    return maxLength ? letters.slice(0, maxLength) : letters;
  };

export const digitsFilter =
  (maxLength?: number): InputFilter =>
  (raw) => {
    const digits = raw.replace(/\D/g, '');
    return maxLength ? digits.slice(0, maxLength) : digits;
  };

export const maxLengthFilter =
  (maxLength: number): InputFilter =>
  (raw) =>
    raw.slice(0, maxLength);

// Envuelve el resultado de `register(field)` de React Hook Form: corrige
// `e.target.value` ANTES de que el onChange original de RHF lo lea, así
// el estado del form (y por lo tanto la validación de Zod) nunca llega a
// ver un carácter inválido — no es solo un mensaje después de enviar.
export function withInputFilter(fieldProps: UseFormRegisterReturn, filter: InputFilter): UseFormRegisterReturn {
  const handleChange: ChangeHandler = (event) => {
    (event.target as HTMLInputElement).value = filter((event.target as HTMLInputElement).value);
    return fieldProps.onChange(event);
  };

  return { ...fieldProps, onChange: handleChange };
}

// `register(field, { valueAsNumber: true })` entrega NaN (no undefined)
// cuando el <input type="number"> queda vacío — y Zod rechaza NaN aunque
// el campo sea `.optional()` (optional solo exceptúa undefined). Como el
// error de ese campo casi nunca se renderiza explícito en el JSX, el
// `handleSubmit` queda bloqueado en silencio, sin ningún mensaje visible.
// Usar esto en vez de `valueAsNumber: true` en todo campo numérico opcional.
export function toOptionalNumber(raw: string): number | undefined {
  return raw === '' ? undefined : Number(raw);
}
