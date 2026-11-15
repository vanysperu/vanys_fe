import { apiClient } from '@/config/apiClient';
import type { ApiResponse } from '@/config/api.types';

// Espejo de grulla_be: push_notification (notificaciones al teléfono).
export interface PushStatus {
  enabled: boolean;
  public_key: string | null;
}

export interface PushTestResult {
  attempted: number;
  sent: number;
  failed: number;
}

const unwrap = <T,>(body: ApiResponse<T>): T => {
  if (!body.success) throw body;
  return body.data;
};

export async function getPushStatus(): Promise<PushStatus> {
  return unwrap((await apiClient.get<ApiResponse<PushStatus>>('/push/status')).data);
}

export async function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  unwrap((await apiClient.post<ApiResponse<unknown>>('/push/subscribe', subscription)).data);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  unwrap((await apiClient.post<ApiResponse<unknown>>('/push/unsubscribe', { endpoint })).data);
}

export async function sendTestPush(): Promise<PushTestResult> {
  return unwrap((await apiClient.post<ApiResponse<PushTestResult>>('/push/test')).data);
}
