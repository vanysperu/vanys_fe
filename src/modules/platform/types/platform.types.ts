// Espejo de CompanyAttributes (grulla_be: company.model.ts).
export interface Company {
  id: number;
  ruc: string;
  business_name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tagline: string | null;
  logo_url: string | null;
  theme_color: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string | null;
}

// Espejo de CreateCompanyDto/UpdateCompanyDto (grulla_be: company.dto.ts).
export interface CreateCompanyDto {
  ruc: string;
  business_name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  theme_color?: string;
}

export type UpdateCompanyDto = Partial<CreateCompanyDto>;

// Espejo de la tabla themes (grulla_be: theme module, catálogo cerrado).
export interface Theme {
  id: number;
  code: string;
  name: string;
  primary_color: string;
  primary_active_color: string;
  primary_light_color: string;
  primary_clarity_color: string;
  primary_inverse_color: string;
  active: boolean;
}

// Espejo de BusinessUnitAttributes (grulla_be: business_unit.model.ts).
export interface BusinessUnit {
  id: number;
  business_code: string;
  address: string | null;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  company_id: number;
  // Horario de atención (pedido explícito del usuario): días ISO
  // (1=lunes..7=domingo) separados por coma, y horas "HH:mm".
  working_days: string | null;
  opens_at: string | null;
  closes_at: string | null;
  is_deleted: boolean;
  created_at: string;
}

// Espejo de CreateBusinessUnitDto (grulla_be: business_unit.dto.ts).
export interface CreateBusinessUnitDto {
  business_code: string;
  company_id: number;
  address?: string | null;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  working_days?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
}

export type UpdateBusinessUnitDto = Partial<Omit<CreateBusinessUnitDto, 'company_id'>>;

// Filtros por columna de "Empresas" (CLAUDE.md sección 7 — consistencia
// entre vistas): se agregan a CountedListParams, nunca lo reemplazan.
export interface CompanyListParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  ruc?: string;
  businessName?: string;
  email?: string;
  status?: string;
}

// Filtros por columna de "Tiendas".
export interface BusinessUnitListParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  businessCode?: string;
  address?: string;
  status?: string;
  // Solo tiene efecto para un caller is_system (ej. el selector de tienda
  // al crear un usuario, una vez elegida la empresa) — un caller normal
  // siempre queda scopeado a su propia empresa sin importar esto.
  companyId?: number;
}
