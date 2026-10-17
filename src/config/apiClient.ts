import axios from 'axios';

import type { ApiClientError, ApiResponse } from '@/config/api.types';
import { API_URL } from '@/config/appConfig';

export const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // El backend SIEMPRE responde { success: false, message, errors, code } en
    // error (grulla_be: core/utils/response.ts -> fail(), CLAUDE.md sección
    // 5). Una descarga con responseType:'blob' (ej. el PDF de cotización)
    // recibe el mismo JSON de error, pero axios lo entrega como Blob en vez
    // de objeto — hay que leerlo como texto antes de poder sacar el mensaje.
    let body = error.response?.data as ApiResponse<unknown> | undefined;
    if (body instanceof Blob) {
      try {
        body = JSON.parse(await body.text());
      } catch {
        body = undefined;
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Un usuario con contraseña temporal pendiente recibe este código en
    // CUALQUIER endpoint que no sea "cambiar contraseña"/"cerrar sesión"
    // (grulla_be: require-password-changed.ts) — antes esto no redirigía a
    // ningún lado, así que si por lo que sea el usuario terminaba fuera de
    // /change-password (recarga, navegación directa a "/", etc.) se quedaba
    // viendo un 403 repetido en cada request, con la pantalla cargando para
    // siempre (bug reportado: "todo se queda cargando"). `window.location`
    // (no `navigate`) a propósito: este interceptor vive fuera de React
    // Router, y una recarga completa además corta cualquier query en curso.
    if (
      body &&
      !body.success &&
      body.code === 'MUST_CHANGE_PASSWORD' &&
      window.location.pathname !== '/change-password'
    ) {
      window.location.href = '/change-password';
    }

    const normalized: ApiClientError = {
      message: body && !body.success ? body.message : 'Error de conexión con el servidor',
      code: body && !body.success ? body.code : undefined,
      errors: body && !body.success ? body.errors : undefined,
    };
    return Promise.reject(normalized);
  },
);
