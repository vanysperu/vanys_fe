// Espejo de grulla_be/src/api/modules/supplier/types (Sprint 2, base común).
export interface Supplier {
  id: number;
  company_id: number;
  document_type: number | null;
  document_number: string | null;
  name: string;
  trade_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_carrier: boolean;
  mtc_registration: string | null;
  active: boolean;
  createdAt: { date: string; time: string };
}

export interface SupplierListParams {
  page: number;
  limit: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  searchTerm?: string;
  status?: string;
  // Solo para el Super Administrador (la empresa elegida).
  companyId?: number;
}

export interface SaveSupplierDto {
  company_id?: number;
  document_type?: number | null;
  document_number?: string | null;
  name: string;
  trade_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_carrier?: boolean;
  mtc_registration?: string | null;
}
