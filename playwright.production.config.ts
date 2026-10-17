import { defineConfig, devices } from '@playwright/test';

// Verificación del PAQUETE DE PRODUCCIÓN (no del entorno de desarrollo):
// corre contra la app ya empaquetada por `npm run release` (grulla_be),
// instalada y arrancada en modo producción contra una base creada SOLO con
// el .sql de producción — exactamente lo que queda en el hosting el primer
// día. Por eso no levanta Vite ni usa las cuentas QA: arranca desde el
// Super Administrador inicial y su contraseña temporal.
//
// Uso:
//   PROD_BASE_URL=http://localhost:4797 \
//   PROD_ADMIN_EMAIL=... PROD_ADMIN_PASSWORD=<temporal> \
//   npx playwright test -c playwright.production.config.ts
//
// NO correr contra el sitio real ya en uso: crea una empresa de prueba.
export default defineConfig({
  testDir: './e2e/production',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.PROD_BASE_URL ?? 'http://localhost:4797',
    trace: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
