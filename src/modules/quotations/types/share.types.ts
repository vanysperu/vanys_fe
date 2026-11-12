// Espejo de grulla_be: quotation/services/share (Sprint 2, ítem 7).

export interface PublicLink {
  url: string;
  // Interruptor "Visible para el cliente" (encendido por defecto).
  enabled: boolean;
  viewCount: number;
  firstViewedAt: { date: string; time: string } | null;
  lastViewedAt: { date: string; time: string } | null;
}

export interface SendQuotationEmailDto {
  to: string;
  cc: string;
  subject: string;
  message: string;
  attachPdf: boolean;
}

export interface SendQuotationEmailResult {
  emailConfigured: boolean;
  includesLink: boolean;
}

// Lo que ve el cliente en /c/<código>: exactamente lo del PDF.
export interface PublicQuotationView {
  code: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  validUntil: string | null;
  productionDays: number | null;
  includesIgv: boolean;
  includesDelivery: boolean;
  includesDesign: boolean;
  client: { name: string; documentNumber: string | null };
  billingName: string | null;
  billingDocumentNumber: string | null;
  items: {
    id: number;
    productName: string;
    sku: string | null;
    color: string | null;
    productCode: string | null;
    techniqueName: string | null;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    igv: number;
    total: number;
  }[];
  subtotal: number;
  igv: number;
  total: number;
  notes: string | null;
  company: {
    name: string;
    ruc: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
    brandColor: string;
    terms: string[];
  };
  store: { code: string; address: string | null } | null;
  paymentAccounts: { id: number; type: string; name: string; number: string | null; qrUrl: string | null }[];
}
