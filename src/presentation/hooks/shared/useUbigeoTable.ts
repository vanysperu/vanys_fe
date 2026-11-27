import { useQuery } from '@tanstack/react-query';

import { loadUbigeoTable, type UbigeoEntry } from '@/lib/ubigeo/ubigeo';

export const ubigeoKeys = {
  all: ['ubigeo'] as const,
  table: () => [...ubigeoKeys.all, 'table'] as const,
};

// Tabla de distritos del INEI. Es un archivo estático que se baja una sola vez
// (no hay llamada a la API) y no cambia durante la sesión.
export function useUbigeoTable() {
  return useQuery({
    queryKey: ubigeoKeys.table(),
    queryFn: loadUbigeoTable,
    staleTime: Infinity,
    // Fijo: no se vuelve a pedir al navegar por el menú (AppSidebar, 27-nov).
    meta: { keepOnNavigate: true },
    gcTime: Infinity,
  });
}

// Nombre legible de un ubigeo ("Miraflores, Lima, Lima"), o el código mismo
// mientras carga la tabla o si no existe en ella.
export function useUbigeoEntry(code: string | null | undefined): UbigeoEntry | undefined {
  const { data } = useUbigeoTable();
  return code ? data?.find((entry) => entry.code === code) : undefined;
}
