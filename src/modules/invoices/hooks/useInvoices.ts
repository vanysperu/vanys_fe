import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  disconnectDrive,
  getDriveConnectUrl,
  getDriveStatus,
  getInvoiceFile,
  getInvoices,
  getPendingPurchases,
  getPurchaseInvoiceCandidates,
  linkPurchases,
  removeInvoicePurchase,
  retryInvoiceDrive,
  updateInvoiceDetails,
  uploadInvoiceFile,
} from '@/modules/invoices/api/invoices.api';
import { invoicesKeys } from '@/modules/invoices/hooks/invoices.keys';
import type { InvoiceListParams, PendingPurchaseParams } from '@/modules/invoices/types/invoice.types';
import { purchaseOrderKeys } from '@/modules/purchaseOrders/hooks/purchaseOrder.keys';
import { quotationsKeys } from '@/modules/quotations/hooks/quotations.keys';

export function usePendingPurchases(params: PendingPurchaseParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: invoicesKeys.pendingPurchases(params),
    queryFn: () => getPendingPurchases(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

// Vincular o quitar compras cambia: Facturas (y su bandeja), el detalle de las
// órdenes de compra (insignia de factura) y el detalle de las cotizaciones
// (Gastos e historial).
const useInvalidateInvoiceLinks = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
    queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    queryClient.invalidateQueries({ queryKey: [...quotationsKeys.all, 'detail'] });
  };
};

export function useLinkPurchases() {
  const invalidate = useInvalidateInvoiceLinks();
  return useMutation({ mutationFn: linkPurchases, onSuccess: invalidate });
}

export function useRemoveInvoicePurchase() {
  const invalidate = useInvalidateInvoiceLinks();
  return useMutation({ mutationFn: removeInvoicePurchase, onSuccess: invalidate });
}

export function useUpdateInvoiceDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateInvoiceDetails,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() }),
  });
}

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoicesKeys.list(params),
    queryFn: () => getInvoices(params),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseInvoiceCandidates(itemId: number, search: string) {
  return useQuery({
    queryKey: invoicesKeys.purchaseCandidates(itemId, search),
    queryFn: () => getPurchaseInvoiceCandidates(itemId, search || undefined),
    placeholderData: keepPreviousData,
  });
}

// Subir el archivo de una factura (desde la compra, el cierre o Facturas).
export function useUploadInvoiceFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadInvoiceFile,
    onSuccess: (_data, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() });
      // Si se reemplazó el archivo, el visor no debe mostrar el anterior.
      queryClient.invalidateQueries({ queryKey: invoicesKeys.file(invoiceId) });
    },
  });
}

export function useRetryInvoiceDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: retryInvoiceDrive,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invoicesKeys.lists() }),
  });
}

// Archivo privado de una factura para verlo en un modal (pedido explícito del
// usuario: antes se abría en otra pestaña). Se descarga con la sesión y queda
// en caché mientras el modal está abierto.
export function useInvoiceFile(invoiceId: number | null) {
  return useQuery({
    queryKey: invoicesKeys.file(invoiceId ?? 0),
    queryFn: () => getInvoiceFile(invoiceId as number),
    enabled: invoiceId !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useDriveStatus(companyId: number | null) {
  return useQuery({
    queryKey: invoicesKeys.driveStatus(companyId ?? 0),
    queryFn: () => getDriveStatus(companyId ?? 0),
    enabled: companyId !== null,
  });
}

// Lleva al Super Administrador a Google para conectar el Drive de la empresa;
// Google vuelve a Empresas con el resultado.
export function useConnectDrive() {
  return useMutation({
    mutationFn: async (companyId: number) => {
      const { url } = await getDriveConnectUrl(companyId);
      window.location.assign(url);
    },
  });
}

export function useDisconnectDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectDrive,
    onSuccess: (_data, companyId) => queryClient.invalidateQueries({ queryKey: invoicesKeys.driveStatus(companyId) }),
  });
}
