import type { InvoiceCurrency } from '@/modules/invoices/types/invoice.types';

// Datos de una factura de compra en el formulario (todos opcionales, D9).
export interface InvoiceDetailsValue {
  supplierId: number | null;
  seriesNumber: string;
  issueDate: string;
  currency: InvoiceCurrency | null;
  total: string;
}

export const EMPTY_INVOICE_DETAILS: InvoiceDetailsValue = { supplierId: null, seriesNumber: '', issueDate: '', currency: null, total: '' };

// Mismo formato que valida el backend: serie de 1 a 4 letras/números, guion y número.
const SERIES_PATTERN = /^[A-Za-z0-9]{1,4}\s*-\s*\d{1,10}$/;

export const invoiceDetailsError = (value: InvoiceDetailsValue): string | null => {
  if (value.seriesNumber.trim() && !SERIES_PATTERN.test(value.seriesNumber.trim())) return 'Escribe la serie y el número así: F001-123';
  if (value.total.trim() && !(Number(value.total) > 0)) return 'El total debe ser mayor a 0';
  return null;
};

// Lo que se manda al backend (vacío = sin dato).
export const invoiceDetailsDto = (value: InvoiceDetailsValue) => ({
  supplier_id: value.supplierId,
  series_number: value.seriesNumber.trim() || null,
  issue_date: value.issueDate || null,
  currency: value.currency,
  total: value.total.trim() ? Number(value.total) : null,
});
