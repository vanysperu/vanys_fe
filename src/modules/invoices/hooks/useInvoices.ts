import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  disconnectDrive,
  getDriveConnectUrl,
  getDriveStatus,
  getInvoiceFile,
  getInvoices,
  retryInvoiceDrive,
  uploadInvoiceFile,
} from '@/modules/invoices/api/invoices.api';
import { invoicesKeys } from '@/modules/invoices/hooks/invoices.keys';
import type { InvoiceListParams } from '@/modules/invoices/types/invoice.types';

export function useInvoices(params: InvoiceListParams) {
  return useQuery({
    queryKey: invoicesKeys.list(params),
    queryFn: () => getInvoices(params),
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
