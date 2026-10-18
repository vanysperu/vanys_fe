// Espejo de las columnas reales devueltas por getUsersList
// (grulla_be: api/modules/users/services/find/user.service.ts).
export interface User {
  id: number;
  name: string;
  paternal_lastname: string;
  maternal_lastname: string | null;
  fullName: string;
  email: string;
  username: string;
  status: boolean;
  status_name: string;
  document_type: number;
  document_type_name: string | null;
  document_number: string | null;
  phone_number: string | null;
  address: string | null;
  gender: string | null;
  gender_name: string | null;
  business_unit_id: number | null;
  role_name: string | null;
  created_at: string;
}

// Contrato estándar de paginación (CLAUDE.md sección 4), igual al de los
// otros 9 módulos ya migrados (grulla_be: core/validators/pagination.validator.ts).
export interface UsersListParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  searchTerm?: string;
  isActive?: boolean;
  roleId?: number;
  // Rango de fecha de registro (YYYY-MM-DD).
  startDate?: string;
  endDate?: string;
  // Filtros por columna (buscadores del header de DataTable), se agregan
  // al buscador global existente sin reemplazarlo.
  name?: string;
  email?: string;
  roleName?: string;
}
