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
  // Pedido mínimo: la menor cantidad que se puede pedir (null = sin mínimo).
  // Informativo: la cotización no lo bloquea.
  min_order_quantity?: number | null;
  // Categoría/subcategoría: filas de Variables Generales (product_category /
  // product_subcategory). El listado trae además sus nombres.
  category_id?: number | null;
  subcategory_id?: number | null;
  category?: CatalogRef | null;
  subcategory?: CatalogRef | null;
  // Colores en los que viene el producto, en orden.
  colors?: ProductColor[];
  // Códigos de proveedores (el SKU es uno solo; estos son extra).
  codes?: ProductCode[];
  // Ruta relativa de la foto (ver buildAssetUrl).
  image_path?: string | null;
  // La empresa del producto tiene habilitadas las fotos: solo así se muestra
  // (y se puede subir) la foto.
  images_enabled?: boolean;
  // Nombre de la empresa (columna exclusiva del Super Administrador).
  company_name?: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface CatalogRef {
  id: number;
  name: string;
}

export interface ProductColor {
  name: string;
  // "#RRGGBB" o null (sin muestra de color).
  hex: string | null;
}

// Código con el que un proveedor identifica el producto.
export interface ProductCode {
  code: string;
  supplier: string | null;
  // Nombre de uno de los colores del producto (opcional).
  color?: string | null;
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
  min_order_quantity?: number | null;
  category_id?: number | null;
  subcategory_id?: number | null;
  colors?: ProductColor[];
  codes?: ProductCode[];
  image_path?: string | null;
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
  // Solo tiene efecto para el Super Administrador: limita el listado a esa
  // empresa (ej. los selectores de un formulario, una vez elegida la empresa,
  // para no mezclar información entre empresas).
  companyId?: number;
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
  // Solo productos: filtros por categoría, subcategoría y color.
  categoryId?: number;
  subcategoryId?: number;
  color?: string;
  // Productos con un código de proveedor que contiene el texto.
  code?: string;
}
