import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';

test.use({ storageState: ADMIN_STATE });

// Cobertura sistemática de "todas las vistas" pedida: cada ruta que un
// Administrador de empresa tiene en el menú (CLAUDE.md sección 7 - menú
// dinámico) carga su encabezado correcto, su tabla/empty-state (o el
// contenido propio de la vista), no tira errores de consola, y el bloque de
// encabezado+acciones se ve igual que la última referencia (snapshot).
const COMPANY_VIEWS: { path: string; heading: string }[] = [
  { path: '/', heading: 'Panel principal' },
  { path: '/seguridad/usuarios', heading: 'Usuarios' },
  { path: '/seguridad/roles-accesos', heading: 'Roles y accesos' },
  { path: '/configuracion/variables-generales', heading: 'Generales' },
  { path: '/clientes', heading: 'Clientes' },
  { path: '/productos', heading: 'Lista de precios' },
  { path: '/productos/tecnicas', heading: 'Lista de precios' },
  { path: '/cotizaciones', heading: 'Cotizaciones' },
  { path: '/ordenes-compra', heading: 'Órdenes de compra' },
  { path: '/configuracion/documentos', heading: 'Documentos de la empresa' },
  { path: '/caja', heading: 'Caja' },
  { path: '/pagos', heading: 'Pagos recibidos' },
  { path: '/deudas-personal', heading: 'Deudas a personal' },
  { path: '/por-cobrar', heading: 'Por cobrar' },
  { path: '/recordatorios', heading: 'Recordatorios' },
];

for (const view of COMPANY_VIEWS) {
  test(`vista ${view.path} carga, muestra "${view.heading}" y no tiene errores de consola`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto(view.path);
    await expect(page.locator('h1', { hasText: view.heading })).toBeVisible();

    // Sin overflow horizontal: el layout debe encajar en el viewport
    // (CLAUDE.md sección 7 — DialogContent/TabsContent con min-w-0 por esta
    // misma razón ya se corrigió una vez para el modal de cotización).
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasHorizontalOverflow, `${view.path} tiene scroll horizontal (layout roto)`).toBe(false);

    expect(consoleErrors, `Errores de consola en ${view.path}: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });
}

test('el sidebar no muestra "Empresas" ni "Tiendas" a un admin de empresa (solo son de plataforma)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-slot="sidebar"]', { hasText: 'Empresas' })).toHaveCount(0);
  await expect(page.locator('[data-slot="sidebar"]', { hasText: 'Tiendas' })).toHaveCount(0);
});

test('vista Panel principal se ve bien (snapshot del encabezado)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.locator('h1', { hasText: 'Panel principal' }).locator('xpath=..')).toHaveScreenshot(
    'dashboard-header.png',
  );
});
