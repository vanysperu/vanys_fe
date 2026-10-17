import { defineConfig, devices } from '@playwright/test';

// Suite de regresión end-to-end del frontend (CLAUDE.md no define un stack de
// testing propio todavía; Playwright se usa porque hace clics reales en el
// navegador en vez de llamar la API directo, que es justamente lo que se
// pidió validar: "que funcionan bien y se ven bien"). Corre contra el server
// de Vite real (puerto 4250 fijo, ver vite.config.ts) y el backend real
// (puerto 4750) — no hay mocks de red.
export default defineConfig({
  testDir: './e2e/tests',
  // Snapshots deterministas: de lo contrario Playwright anexa el nombre del
  // SO al archivo de referencia y cualquier corrida en una máquina distinta
  // a la que generó el snapshot original falla por "missing snapshot".
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Un solo worker: varios módulos comparten los mismos datos semilla
  // (Acme Corp) y algunas pruebas (roles, usuarios) mutan estado compartido
  // — correr en paralelo generaría condiciones de carrera entre specs.
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      // Pequeña tolerancia a antialiasing/subpíxeles entre corridas, nunca a
      // diferencias de contenido real.
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },
  use: {
    baseURL: 'http://localhost:4250',
    // 'retain-on-failure' generaba corridas falsas en Windows: al escribir
    // el .trace/.network al cerrar el contexto, Windows Defender (u otro
    // proceso) a veces bloquea el archivo a medio escribir y Playwright
    // revienta con ENOENT — un fallo de infraestructura, no de la app, que
    // además tapaba el error real del test. Screenshot sí se mantiene (es
    // una sola escritura, nunca mostró el mismo problema).
    trace: 'off',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: /global\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:4250',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
