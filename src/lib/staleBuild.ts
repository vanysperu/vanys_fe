// Después de publicar una versión nueva, quien tenía la app abierta (o la app
// instalada en el celular, que queda en memoria) sigue con el JS viejo. Al
// entrar a una pantalla que se carga aparte (React.lazy), ese archivo ya no
// existe en el servidor y Vite lanza `vite:preloadError`: se recarga la página
// para tomar la versión nueva.
//
// Una sola vez por minuto: si el archivo falta por otro motivo (sin internet,
// servidor caído), no se entra en un ciclo de recargas (CLAUDE.md §8).
const RELOAD_KEY = 'vanys:stale-build-reload-at';
const MIN_INTERVAL_MS = 60_000;

const lastReloadAt = (): number => {
  try {
    return Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    return 0;
  }
};

export function reloadOnStaleBuild(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (Date.now() - lastReloadAt() < MIN_INTERVAL_MS) return;
    event.preventDefault();
    try {
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // Sin sessionStorage (modo privado estricto): igual se recarga una vez.
    }
    window.location.reload();
  });
}
