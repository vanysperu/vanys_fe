import { useEffect, useState } from 'react';

// El valor, pero recién cuando deja de cambiar por `delayMs`: así un buscador
// que consulta la API no dispara un pedido por cada tecla.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
