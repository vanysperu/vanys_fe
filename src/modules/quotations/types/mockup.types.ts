// Mockup (diseño) de una cotización (pedido del usuario, 21-nov). Solo lo ve
// el equipo: el archivo se pide con la sesión (nunca una URL pública).
export interface QuotationMockup {
  id: number;
  quotation_id: number;
  // Producto de la cotización al que corresponde (null = General).
  quotation_item_id: number | null;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  caption: string | null;
  created_at: string;
  uploaded_by: string | null;
}

export interface UploadMockupInput {
  file: File;
  quotationItemId: number | null;
  caption: string;
}
