import type { InvoiceListParams } from '@/modules/invoices/types/invoice.types';

export const invoicesKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoicesKeys.all, 'list'] as const,
  list: (params: InvoiceListParams) => [...invoicesKeys.lists(), params] as const,
  // Cuelga de lists(): una compra nueva refresca también estas opciones.
  purchaseCandidates: (itemId: number, search: string) => [...invoicesKeys.lists(), 'purchase-candidates', itemId, search] as const,
  file: (invoiceId: number) => [...invoicesKeys.all, 'file', invoiceId] as const,
  driveStatus: (companyId: number) => [...invoicesKeys.all, 'drive-status', companyId] as const,
};
