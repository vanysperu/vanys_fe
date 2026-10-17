import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { API_ORIGIN } from '@/config/appConfig';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// El backend guarda rutas relativas ("/uploads/company-assets/2/x.png",
// sin dominio) para el logo de la empresa y los QR de pago — VITE_API_URL
// apunta a ".../api", así que se le quita ese sufijo para armar la URL
// completa donde SÍ vive el archivo estático (fuera del router /api).
export function buildAssetUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `${API_ORIGIN}${relativePath}`;
}
