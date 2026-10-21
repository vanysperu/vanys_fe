// Espejo de RoleAttributes (grulla_be: role.model.ts).
export interface Role {
  id: number;
  name: string;
  description: string | null;
  status: boolean;
  company_id: number | null;
  is_system: boolean;
  key_code: string | null;
  created_at: string;
  // Nombre de la empresa dueña (solo en el listado); null en plantillas y en
  // roles de plataforma.
  company_name?: string | null;
}

export interface CreateRoleDto {
  name: string;
  description?: string | null;
  // Empresa dueña del rol; sin empresa queda como plantilla de todas.
  company_id?: number;
}

// La empresa no se cambia al editar (el backend la ignora).
export type UpdateRoleDto = Partial<Omit<CreateRoleDto, 'company_id'>>;

// Filtros por columna de la tabla de roles (CLAUDE.md sección 7 —
// "consistencia entre vistas"): se agregan a CountedListParams, nunca lo
// reemplazan, para no romper otros callers (company/business_unit).
export interface RoleListParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  name?: string;
  description?: string;
  isSystem?: string;
  // "active", "inactive" o ambos separados por coma.
  status?: string;
}

// Espejo de RoleResourceTreeResponse (grulla_be: roles_resources.interface.ts).
export interface ResourceTreeItem {
  id: number;
  module_id: number;
  parent_id: number | null;
  type: 'view' | 'button' | 'endpoint';
  code: string;
  name: string;
  route: string | null;
  verb: string | null;
  icon: string | null;
  show_in_menu: boolean;
  position: number;
  granted: boolean;
  children: ResourceTreeItem[];
}

export interface ModuleTreeItem {
  id: number;
  code: string;
  name: string;
  icon: string | null;
  position: number;
  resources: ResourceTreeItem[];
}

export interface RoleResourceTree {
  role: { id: number; name: string };
  modules: ModuleTreeItem[];
}

export interface SetRoleResourcesDto {
  resourceIds: {
    add?: number[];
    remove?: number[];
  };
}
