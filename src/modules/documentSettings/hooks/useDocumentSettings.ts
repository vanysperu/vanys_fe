import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyDocumentSettings,
  updateMyDocumentSettings,
  uploadCompanyAsset,
} from '@/modules/documentSettings/api/documentSettings.api';
import { updateVariableGeneral } from '@/modules/variableGeneral/api/variableGeneral.api';
import { variableGeneralKeys } from '@/modules/variableGeneral/hooks/variableGeneral.keys';
import type { UpdateVariableGeneralDto } from '@/modules/variableGeneral/types/variableGeneral.types';

const documentSettingsKeys = {
  all: ['documentSettings', 'mine'] as const,
  // companyId en la key: el Super Administrador alterna entre empresas y
  // cada una tiene sus propios datos (nunca reutilizar los de otra).
  mine: (companyId: number | undefined) => [...documentSettingsKeys.all, companyId ?? 'own'] as const,
};

// companyId: solo para el Super Administrador; undefined = la del usuario.
export function useMyDocumentSettings(companyId?: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: documentSettingsKeys.mine(companyId),
    queryFn: () => getMyDocumentSettings(companyId),
    enabled: options?.enabled,
  });
}

export function useUpdateMyDocumentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyDocumentSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentSettingsKeys.all }),
  });
}

// La vista previa del PDF se guarda 1 minuto (usePreviewQuotationPdf): sin esto,
// una cuenta recién ocultada seguiría apareciendo y parecería que no se guardó.
const isQuotationPdfQuery = ({ queryKey }: { queryKey: readonly unknown[] }) =>
  queryKey[0] === 'quotations' && queryKey[queryKey.length - 1] === 'pdf';

export function useUpdatePaymentAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateVariableGeneralDto }) => updateVariableGeneral(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: variableGeneralKeys.lists() });
      queryClient.removeQueries({ predicate: isQuotationPdfQuery });
    },
  });
}

export function useUploadCompanyAsset() {
  return useMutation({
    mutationFn: uploadCompanyAsset,
  });
}
