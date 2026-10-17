// Límite de caracteres compartido por todos los campos de notas/comentarios
// libres del sistema (cotización, orden de compra, registro de compra) —
// un solo valor para que el `maxLength` del <Textarea>, el contador visible
// (ver CharCounter) y la validación de Zod nunca queden desincronizados.
export const NOTES_MAX_LENGTH = 500;
