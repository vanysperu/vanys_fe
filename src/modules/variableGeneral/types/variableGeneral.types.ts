import type { PagedListResult } from '@/config/api.types';

// Espejo de VariableGeneralAttributes (grulla_be: variable_general.model.ts).
export interface VariableGeneral {
  id: number;
  category: string;
  title: string;
  prefix_id: string;
  name: string;
  description: string | null;
  ref1: string | null;
  ref2: string | null;
  company_id: number | null;
  is_deleted: boolean;
}

export interface CreateVariableGeneralDto {
  category: string;
  title: string;
  prefix_id: string;
  name: string;
  description?: string;
  ref1?: string;
  ref2?: string;
  // Solo lo respeta el backend cuando el caller es is_system; ver
  // grulla_be: createVariableGeneralController.
  company_id?: number;
}

export type UpdateVariableGeneralDto = Partial<CreateVariableGeneralDto>;

// Shape propio de este listado (adminView, siempre activo desde el
// frontend): ahora usa el formato de paginación uniforme del backend
// (CLAUDE.md sección 4 / grulla_be: buildPaginationMeta) — { data, meta }.
export type VariableGeneralListResult = PagedListResult<VariableGeneral>;

export interface VariableGeneralListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  ignorePagination?: boolean;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // Filtros por columna (buscadores del header de DataTable).
  title?: string;
  name?: string;
  status?: string;
}
