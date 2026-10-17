// Solo los campos que "mi empresa" puede leer/editar de sí misma para el
// PDF de cotización — espejo de lo que expone GET/PUT /company/my-document-settings
// (grulla_be: company.controller.ts). El resto de columnas de `company`
// (theme_color, ruc, is_deleted…) son de gestión de plataforma, no de acá.
export interface CompanyDocumentSettings {
  id: number;
  business_name: string;
  ruc: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  // Reusa la columna legal_terms_caption como el texto único de "términos
  // y condiciones" que se imprime en TODAS las cotizaciones (preview y
  // descarga) — ver quotation_pdf.service.ts.
  legal_terms_caption: string | null;
}

export interface UpdateCompanyDocumentSettingsDto {
  business_name?: string;
  address?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  legal_terms_caption?: string | null;
}
