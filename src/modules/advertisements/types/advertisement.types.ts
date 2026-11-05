// Espejo de grulla_be: advertisement/types/advertisement.types.ts.

// Zonas de anuncios: filas de Variables Generales con esta categoría (su
// "Código" es lo que manda la web: ?zone=inicio).
export const ADVERTISEMENT_ZONE_CATEGORY = 'advertisement_zone';

export type AdvertisementStatusFilter = 'active' | 'inactive' | 'all';

export interface LocalDateTime {
  date: string;
  time: string;
}

export interface AdvertisementZone {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
}

export interface Advertisement {
  id: number;
  company_id: number;
  // Solo se muestra al Super Administrador.
  company_name: string | null;
  zone: AdvertisementZone | null;
  title: string;
  link_url: string | null;
  image_path: string;
  // Orden dentro de su zona (1 = primero en la web).
  position: number;
  // Cuántos anuncios hay en su zona.
  zone_total: number;
  is_active: boolean;
  created_at: LocalDateTime;
  updated_at: LocalDateTime | null;
}

export interface AdvertisementListParams {
  page: number;
  limit: number;
  // Solo tiene efecto para el Super Administrador.
  companyId?: number;
  // Una zona o 'none' (sin zona).
  zoneId?: number | 'none';
  status?: AdvertisementStatusFilter;
  title?: string;
}

export interface CreateAdvertisementDto {
  // Solo la manda el Super Administrador.
  company_id?: number;
  zone_id?: number | null;
  title: string;
  link_url?: string | null;
  image_path: string;
}

export interface UpdateAdvertisementDto {
  zone_id?: number | null;
  title?: string;
  link_url?: string | null;
  image_path?: string;
  position?: number;
}
