// Espejo de ClientAttributes (grulla_be: client.model.ts).
export interface Client {
  id: number;
  company_id: number;
  business_unit_id: number | null;
  name: string;
  // Catálogo global general_variable (category="document_type"), mismos
  // códigos que usuarios: 1=DNI, 2=Pasaporte, 3=CE, 6=RUC. Viaja como
  // string desde la BD (columna varchar), igual que en usuarios.
  document_type: string | null;
  document_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface CreateClientDto {
  company_id: number;
  business_unit_id?: number;
  name: string;
  document_type?: number;
  document_number?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type UpdateClientDto = Partial<Omit<CreateClientDto, 'company_id'>>;

export interface ClientListParams {
  // Solo tiene efecto para el Super Administrador: limita el listado a esa
  // empresa (ej. los selectores de un formulario, una vez elegida la empresa,
  // para no mezclar información entre empresas).
  companyId?: number;
  page?: number;
  limit?: number;
  searchTerm?: string;
  // orderBy/orderDir: el backend (client.controller.ts) ya los soporta vía
  // parsePaginationParams, se agregan acá para poder ordenar la tabla.
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // Filtros por columna (buscadores del header de DataTable).
  phone?: string;
  documentNumber?: string;
  name?: string;
  email?: string;
  // "active", "inactive" o ambos separados por coma (filtro de selección
  // múltiple de la columna Estado).
  status?: string;
  // Rango de fecha de registro (YYYY-MM-DD).
  dateFrom?: string;
  dateTo?: string;
}
