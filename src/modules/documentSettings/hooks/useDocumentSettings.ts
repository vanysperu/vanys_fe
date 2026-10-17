import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getMyDocumentSettings,
  updateMyDocumentSettings,
  uploadCompanyAsset,
} from '@/modules/documentSettings/api/documentSettings.api';

const documentSettingsKeys = {
  mine: ['documentSettings', 'mine'] as const,
};

export function useMyDocumentSettings() {
  return useQuery({
    queryKey: documentSettingsKeys.mine,
    queryFn: getMyDocumentSettings,
  });
}

export function useUpdateMyDocumentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyDocumentSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentSettingsKeys.mine }),
  });
}

export function useUploadCompanyAsset() {
  return useMutation({
    mutationFn: uploadCompanyAsset,
  });
}
