import { useSyncExternalStore } from 'react';

import { getInstallPromptState, subscribeInstallPrompt, type InstallPromptState } from '@/lib/installPrompt';

const SERVER_STATE: InstallPromptState = { event: null, installed: false };

// Estado de la instalación con un toque (Android), ver lib/installPrompt.ts.
export function useInstallPrompt(): InstallPromptState {
  return useSyncExternalStore(subscribeInstallPrompt, getInstallPromptState, () => SERVER_STATE);
}
