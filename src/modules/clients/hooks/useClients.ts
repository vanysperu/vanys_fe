import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createClient, getClients, toggleClientStatus, updateClient } from '@/modules/clients/api/clients.api';
import { clientsKeys } from '@/modules/clients/hooks/clients.keys';
import type { ClientListParams, UpdateClientDto } from '@/modules/clients/types/client.types';

export function useClients(params: ClientListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: clientsKeys.list(params),
    queryFn: () => getClients(params),
    enabled: options?.enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKeys.lists() }),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateClientDto }) => updateClient(id, dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKeys.lists() }),
  });
}

export function useToggleClientStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleClientStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientsKeys.lists() }),
  });
}
