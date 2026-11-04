// Espejo de ApiKeyDto (grulla_be: api_key/types/api_key.types.ts).
export interface LocalDateTime {
  date: string;
  time: string;
}

export interface ApiKey {
  id: number;
  name: string;
  // Lo único legible de la key (ej. "vnk_m4D4Z7ST"): sirve para reconocerla,
  // no para autenticarse.
  key_prefix: string;
  company: { id: number; name: string };
  business_unit: { id: number; code: string } | null;
  is_revoked: boolean;
  last_used_at: LocalDateTime | null;
  created_at: LocalDateTime;
  created_by: { id: number; name: string } | null;
  revoked_at: LocalDateTime | null;
  // Empresas extra a las que puede replicar productos en la subida masiva.
  replicate_companies: { id: number; name: string }[];
}

// Solo al crear: la key completa viaja UNA vez y no se vuelve a mostrar.
export interface CreatedApiKey extends ApiKey {
  plain_key: string;
}

export type ApiKeyStatusFilter = 'active' | 'revoked' | 'all';

export interface ApiKeyListParams {
  page: number;
  limit: number;
  companyId?: number;
  status?: ApiKeyStatusFilter;
  name?: string;
}

export interface CreateApiKeyDto {
  company_id: number;
  business_unit_id?: number | null;
  name: string;
  replicate_company_ids?: number[];
}

export interface UpdateApiKeyDto {
  name?: string;
  business_unit_id?: number | null;
  // Reemplaza la lista completa.
  replicate_company_ids?: number[];
}
