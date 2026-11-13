import type { StockDocument } from '@/modules/inventory/types/inventory.types';

// Color del estado de un documento de inventario (lista y detalle).
export const statusVariant = (status: StockDocument['status']) =>
  status === 'posted' || status === 'received' ? 'success' : status === 'cancelled' ? 'destructive' : status === 'draft' ? 'muted' : 'warning';
