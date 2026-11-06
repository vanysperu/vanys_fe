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

// ref2: null lo quita (ej. el QR de una cuenta de pago).
export type UpdateVariableGeneralDto = Partial<Omit<CreateVariableGeneralDto, 'ref2'>> & { ref2?: string | null };

// Shape propio de este listado (adminView, siempre activo desde el
// frontend): ahora usa el formato de paginación uniforme del backend
// (CLAUDE.md sección 4 / grulla_be: buildPaginationMeta) — { data, meta }.
export type VariableGeneralListResult = PagedListResult<VariableGeneral>;

export interface VariableGeneralListParams {
  // Solo tiene efecto para el Super Administrador: limita el listado a esa
  // empresa (ej. los selectores de un formulario, una vez elegida la empresa,
  // para no mezclar información entre empresas).
  companyId?: number;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  ignorePagination?: boolean;
  // 'manage' = modo de la pantalla de gestión (Variables Generales): un usuario
  // de empresa recibe SOLO las filas de su empresa, sin las globales (esas las
  // gestiona únicamente el Super Administrador). Sin este valor el listado
  // incluye las globales, que los selectores de otras pantallas necesitan
  // (métodos de pago, etapas por defecto...). Solo la pantalla de gestión lo envía.
  scope?: 'manage';
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // Filtros por columna (buscadores del header de DataTable).
  title?: string;
  name?: string;
  status?: string;
}
