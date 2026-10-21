// Un producto se registra UNA sola vez con hasta 4 precios de catálogo en
// simultáneo (no un producto por cada modalidad) — cada uno opcional. Al
// armar una cotización, cada item elige cuál usar, o un precio
// "personalizado" propio de esa cotización (ver QuotationItemPricingMode
// en quotation.types.ts).
export interface Product {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  sku: string | null;
  price_unit: number | null;
  price_hundred: number | null;
  price_half_thousand: number | null;
  price_thousand: number | null;
  // false = se cotiza sin técnica de personalización (ni en la cotización ni
  // en el PDF). Apagado por defecto en productos nuevos.
  requires_customization: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface CreateProductDto {
  company_id: number;
  name: string;
  description?: string;
  sku?: string;
  price_unit?: number | null;
  price_hundred?: number | null;
  price_half_thousand?: number | null;
  price_thousand?: number | null;
  requires_customization?: boolean;
}

export type UpdateProductDto = Partial<Omit<CreateProductDto, 'company_id'>>;

// Espejo de CustomizationTechniqueAttributes: igual que "Product", un precio
// POR UNIDAD según el modo de precio del item.
export interface CustomizationTechnique {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  price_unit: number | null;
  price_hundred: number | null;
  price_half_thousand: number | null;
  price_thousand: number | null;
  is_deleted: boolean;
  created_at: string;
}

export interface CreateTechniqueDto {
  company_id: number;
  name: string;
  description?: string;
  price_unit?: number | null;
  price_hundred?: number | null;
  price_half_thousand?: number | null;
  price_thousand?: number | null;
}

export type UpdateTechniqueDto = Partial<Omit<CreateTechniqueDto, 'company_id'>>;

export interface CatalogListParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  // orderBy/orderDir: soportados por el backend (product.controller.ts)
  // vía parsePaginationParams, se agregan para poder ordenar la tabla.
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
  // Filtros por columna (compartidos entre productos y técnicas — sku solo
  // aplica a productos, el backend simplemente lo ignora si no corresponde).
  name?: string;
  sku?: string;
  // "active", "inactive" o ambos separados por coma.
  status?: string;
  // Rango de fecha de registro (YYYY-MM-DD).
  dateFrom?: string;
  dateTo?: string;
}
