// Límite de caracteres compartido por todos los campos de notas/comentarios
// libres del sistema (cotización, orden de compra, registro de compra) —
// un solo valor para que el `maxLength` del <Textarea>, el contador visible
// (ver CharCounter) y la validación de Zod nunca queden desincronizados.
export const NOTES_MAX_LENGTH = 500;

// Opciones del filtro de "Estado" en las tablas de catálogos (columna con
// filterType: 'multiselect'). Antes ese filtro era un texto libre que solo
// funcionaba si se escribía exactamente "inactive"; ahora se elige de una
// lista y el backend acepta uno o ambos valores.
export const ACTIVE_STATUS_FILTER_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];
