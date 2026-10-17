// Configuración que se puede cambiar SIN recompilar el frontend.
//
// `public/config.js` se copia tal cual al build y se carga antes que la app
// (ver index.html). En el hosting basta con editar ese archivo desde el
// administrador de archivos para apuntar la app a otra URL de API — sin
// esto, la URL quedaba "horneada" en el bundle al compilar y cambiar de
// dominio obligaba a recompilar y volver a subir todo.
interface RuntimeAppConfig {
  apiUrl?: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeAppConfig;
  }
}

// Prioridad: config.js (si trae un valor) -> VITE_API_URL del build ->
// "/api" relativo (backend y frontend servidos desde el mismo dominio).
const resolveApiUrl = (): string => {
  const runtime = window.__APP_CONFIG__?.apiUrl?.trim();
  if (runtime) return runtime.replace(/\/+$/, '');

  const buildTime = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (buildTime) return buildTime.replace(/\/+$/, '');

  return '/api';
};

export const API_URL = resolveApiUrl();

// Origen donde viven los archivos estáticos del backend (/uploads/...): la
// URL de la API sin el sufijo "/api". Con API relativa ("/api") queda ""
// y las imágenes se piden al mismo dominio.
export const API_ORIGIN = API_URL.replace(/\/api$/, '');
