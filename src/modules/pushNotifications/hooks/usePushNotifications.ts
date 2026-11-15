import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getCurrentSubscription, getPushSupport, subscribeThisDevice, unsubscribeThisDevice } from '@/lib/pushNotifications';
import { getPushStatus, removePushSubscription, savePushSubscription, sendTestPush } from '@/modules/pushNotifications/api/pushNotifications.api';

export const pushKeys = {
  all: ['push'] as const,
  status: () => [...pushKeys.all, 'status'] as const,
  // Si ESTE teléfono ya está suscrito (lo sabe el navegador, no el servidor).
  device: () => [...pushKeys.all, 'device'] as const,
};

export function usePushStatus(enabled: boolean) {
  return useQuery({ queryKey: pushKeys.status(), queryFn: getPushStatus, enabled, staleTime: 10 * 60 * 1000 });
}

export function useDeviceSubscribed(enabled: boolean) {
  return useQuery({
    queryKey: pushKeys.device(),
    queryFn: async () => Boolean(await getCurrentSubscription()),
    enabled: enabled && getPushSupport() === 'supported',
  });
}

export function useEnablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicKey: string) => savePushSubscription(await subscribeThisDevice(publicKey)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushKeys.device() }),
  });
}

const disablePush = async (): Promise<void> => {
  const endpoint = await unsubscribeThisDevice();
  if (endpoint) await removePushSubscription(endpoint);
};

// Para "Salir": apaga los avisos de este teléfono sin frenar nunca el cierre
// de sesión (sin service worker, sin red o si tarda más de 3 s, se sigue igual;
// el servidor igual descarta solo las suscripciones que dejan de existir).
export async function disablePushOnThisDevice(): Promise<void> {
  if (getPushSupport() !== 'supported') return;
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
  await Promise.race([disablePush().catch(() => undefined), timeout]);
}

export function useDisablePush() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disablePush,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pushKeys.device() }),
  });
}

export function useSendTestPush() {
  return useMutation({ mutationFn: sendTestPush });
}
