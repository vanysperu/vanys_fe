// Instalación de la app con un toque en Android (Chrome, Edge, Samsung
// Internet). Esos navegadores avisan con el evento "beforeinstallprompt"
// cuando la app se puede instalar; se guarda para lanzarlo después desde el
// aviso propio de Vanys (src/app/layout/InstallAppPrompt.tsx). En iPhone este
// evento no existe: ahí solo se puede guiar a la persona paso a paso.

// Evento no estándar de Chromium (no viene en lib.dom).
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface InstallPromptState {
  // Evento listo para mostrar el diálogo nativo de instalación (se usa una vez).
  event: BeforeInstallPromptEvent | null;
  // La app se acaba de instalar desde este navegador.
  installed: boolean;
}

// Store mínimo para useSyncExternalStore: el objeto se reemplaza en cada
// cambio, así React compara por referencia sin renders de más.
let state: InstallPromptState = { event: null, installed: false };
const listeners = new Set<() => void>();

const setState = (next: InstallPromptState): void => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const getInstallPromptState = (): InstallPromptState => state;

export const subscribeInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Se llama una sola vez al arrancar (main.tsx), antes de montar React: el
// navegador puede disparar el evento apenas carga la página.
export function listenForInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Evita la barrita propia de Chrome: se muestra el aviso de Vanys, que es
    // el mismo en iPhone y Android. El menú ⋮ → "Instalar app" sigue andando.
    event.preventDefault();
    setState({ ...state, event });
  });
  window.addEventListener('appinstalled', () => setState({ event: null, installed: true }));
}

// Abre el diálogo nativo de instalación. Devuelve true si la persona aceptó.
export async function promptInstall(): Promise<boolean> {
  const { event } = state;
  if (!event) return false;

  // El navegador solo deja usar cada evento una vez.
  setState({ ...state, event: null });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}
