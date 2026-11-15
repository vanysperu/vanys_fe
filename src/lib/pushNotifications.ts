// Notificaciones al teléfono (Web Push estándar). El service worker
// (public/sw.js) recibe el aviso y lo muestra aunque la app esté cerrada.
//
// Requisitos de los navegadores:
// - Android (Chrome, Edge, Samsung Internet) y escritorio: funcionan directo.
// - iPhone/iPad: iOS 16.4 o más nuevo y la app INSTALADA en la pantalla de
//   inicio; desde Safari normal no existen las notificaciones.
// - Siempre lo activa la persona con un toque (el navegador pide permiso).

export type PushSupport = 'supported' | 'needs-install' | 'unsupported';

interface IosNavigator extends Navigator {
  standalone?: boolean;
}

const isIosDevice = (): boolean =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isRunningInstalled = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as IosNavigator).standalone === true;

export function getPushSupport(): PushSupport {
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  // En iPhone, Safari normal no expone PushManager: hay que instalar la app.
  if (isIosDevice() && !isRunningInstalled()) return 'needs-install';
  return hasApis ? 'supported' : 'unsupported';
}

// La clave pública VAPID viene en base64url; el navegador la pide en bytes.
const base64UrlToBytes = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
};

// El service worker solo se registra en el build de producción (ver
// lib/serviceWorker.ts): en desarrollo no hay notificaciones.
const getRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
};

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  const registration = await getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

export class PushPermissionError extends Error {}

// La suscripción la resuelve el servicio de Google/Apple: si no responde (sin
// señal, navegador sin ese servicio) el botón no puede quedar cargando para siempre.
const SUBSCRIBE_TIMEOUT_MS = 20_000;

const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new PushPermissionError(message)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
};

// El navegador rechaza en inglés y con detalle técnico; la persona ve un
// mensaje en español (el original queda en consola para soporte).
const subscribeWithFriendlyErrors = async (registration: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> => {
  try {
    return await withTimeout(
      registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }),
      SUBSCRIBE_TIMEOUT_MS,
      'El servicio de notificaciones del teléfono no respondió. Revisa tu conexión e inténtalo otra vez.',
    );
  } catch (error: unknown) {
    if (error instanceof PushPermissionError) throw error;
    console.warn('No se pudo suscribir a las notificaciones', error);
    throw new PushPermissionError('Este teléfono no aceptó activar las notificaciones. Revisa que estén permitidas para Vanys e inténtalo otra vez.');
  }
};

// Pide permiso y crea la suscripción de ESTE teléfono. Se llama desde un toque
// del usuario (iPhone no deja pedir permiso de otra forma).
export async function subscribeThisDevice(publicKey: string): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new PushPermissionError(
      permission === 'denied'
        ? 'Las notificaciones están bloqueadas para esta app. Actívalas en la configuración del teléfono.'
        : 'No se dio permiso para las notificaciones.',
    );
  }
  // Sin service worker registrado (desarrollo, o falló al cargar) "ready" no
  // termina nunca: se corta con un mensaje en vez de dejar el botón colgado.
  if (!(await getRegistration())) {
    throw new PushPermissionError('La app todavía no terminó de cargar. Ciérrala, vuelve a abrirla e inténtalo de nuevo.');
  }
  // "ready" espera a que el worker quede activo (subscribe lo necesita).
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? (await subscribeWithFriendlyErrors(registration, publicKey));
  return subscription.toJSON();
}

// Quita la suscripción del navegador y devuelve su dirección (para avisar al servidor).
export async function unsubscribeThisDevice(): Promise<string | null> {
  const subscription = await getCurrentSubscription();
  if (!subscription) return null;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}
