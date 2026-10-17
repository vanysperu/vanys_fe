// Espejo exacto del envelope real del backend (grulla_be:
// core/utils/response.ts -> ok()/fail(), CLAUDE.md sección 5).
// Usa "success" (no "status") como discriminante.
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Shape real de paginatedListGenerator (grulla_be: api/functions/paginatedListGenerator.ts).
export interface PaginatedResult<T> {
  page?: number;
  pageSize?: number;
  totalCount: number;
  data: T[];
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Segundo shape de paginación real, distinto al de arriba: lo usan los
// módulos de plataforma (company, business_unit — findAndCountAll de
// Sequelize devuelto tal cual, sin pasar por paginatedListGenerator).
export interface CountedListResult<T> {
  page?: number;
  limit?: number;
  count: number;
  rows: T[];
}

export interface CountedListParams {
  page?: number;
  limit?: number;
  // Ordenamiento por columna (mismo criterio que PagedListResult/Clientes-
  // Productos): opcional, cada módulo decide qué columnas son sortKey válidas.
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

// Shape uniforme de paginación (CLAUDE.md sección 4) — grulla_be ya migró a
// esta forma los módulos: company, business_unit, client,
// customization_technique, product, purchase_order, quotation, resource,
// variable_general (solo en su modo admin) y users. El resto (role, theme,
// module) se quedan con CountedListResult/PaginatedResult de arriba.
export interface PagedListResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiClientError {
  message: string;
  code?: string;
  errors?: unknown;
}
