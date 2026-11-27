import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

// Prueba E2E del SISTEMA COMPLETO, de punta a punta (`npm run test:e2e:full`):
// parte de una base de fábrica (solo el Super Administrador) y recorre por la
// interfaz todo lo que haría un cliente nuevo: empresa, tienda, usuarios,
// catálogo, cotización, cobros, compras, Caja, préstamos y estadísticas.
//
// Levanta SU PROPIO backend y frontend (no reutiliza los de desarrollo):
//   - backend: grulla_be/scripts/e2e-full-server.js, que crea/migra/resetea la
//     base E2E_PROY_BD (grulla_e2e_local) y escucha en E2E_PROY_APP_PORT;
//   - frontend: el BUILD de producción (vite build + vite preview) en
//     E2E_FRONT_PORT apuntando a ese backend. No el servidor de desarrollo:
//     ese sirve cientos de archivos sueltos y Chromium a veces se quedaba sin
//     recursos (ERR_INSUFFICIENT_RESOURCES) y una pantalla quedaba en blanco.
//     Además el build es lo que de verdad usa el cliente.
// Los puertos y la base salen del .env del backend (bloque E2E_*), una sola
// fuente para los dos repos.

const BACKEND_DIR = path.resolve(import.meta.dirname, process.env.E2E_BACKEND_DIR ?? '../grulla_be');

// Lee solo las claves E2E_* del .env del backend (sin credenciales).
const readBackendE2eEnv = (): Record<string, string> => {
  const file = path.join(BACKEND_DIR, '.env');
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((line) => /^(E2E_[A-Z_]+)=(.*)$/.exec(line.trim()))
      .filter((match): match is RegExpExecArray => match !== null)
      .map((match) => [match[1], (match[2] ?? '').trim()]),
  );
};

const backendEnv = readBackendE2eEnv();
const API_PORT = process.env.E2E_PROY_APP_PORT ?? backendEnv.E2E_PROY_APP_PORT ?? '4770';
const FRONT_PORT = process.env.E2E_FRONT_PORT ?? backendEnv.E2E_FRONT_PORT ?? '4270';
const API_URL = `http://localhost:${API_PORT}/api`;

// e2e/helpers.ts (apiJson) lee E2E_API_URL: que apunte al backend de la prueba.
process.env.E2E_API_URL = API_URL;

export default defineConfig({
  testDir: './e2e/full',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Un solo recorrido, en orden: cada paso usa lo que creó el anterior.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report-full' }]],
  timeout: 120_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${FRONT_PORT}`,
    trace: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Crea/migra/resetea grulla_e2e_local y levanta el backend.
      command: 'node scripts/e2e-full-server.js',
      cwd: BACKEND_DIR,
      port: Number(API_PORT),
      // Nunca se reutiliza un servidor ya levantado: ese puerto podría ser de
      // otro proyecto o de desarrollo (CLAUDE.md §0). Si está ocupado, falla.
      reuseExistingServer: false,
      // Migraciones + seeders de fábrica + arranque.
      timeout: 600_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Build en su propia carpeta (dist-e2e) para no pisar el dist del release.
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${FRONT_PORT} --strictPort`,
      url: `http://localhost:${FRONT_PORT}`,
      // VITE_API_URL del entorno manda sobre .env.production (se fija al compilar).
      // NODE_ENV=production, igual que el release (scripts/package-release.js).
      // (El login en blanco del 26-nov era otra cosa: la letra de la unidad,
      // "c:" o "C:"; se arregló en vite.config.ts.)
      env: { VITE_API_URL: API_URL, NODE_ENV: 'production' },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
