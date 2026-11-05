import type { InvoiceListParams } from '@/modules/invoices/types/invoice.types';

export const invoicesKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoicesKeys.all, 'list'] as const,
  list: (params: InvoiceListParams) => [...invoicesKeys.lists(), params] as const,
  file: (invoiceId: number) => [...invoicesKeys.all, 'file', invoiceId] as const,
  driveStatus: (companyId: number) => [...invoicesKeys.all, 'drive-status', companyId] as const,
};
