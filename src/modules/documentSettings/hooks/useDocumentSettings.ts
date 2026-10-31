import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyDocumentSettings,
  updateMyDocumentSettings,
  uploadCompanyAsset,
} from '@/modules/documentSettings/api/documentSettings.api';

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

export function useUploadCompanyAsset() {
  return useMutation({
    mutationFn: uploadCompanyAsset,
  });
}
