import { expect, type Locator, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { openMenuGroup } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// Cobertura sistemática de "todas las vistas" pedida: cada ruta que un
// Administrador de empresa tiene en el menú (CLAUDE.md sección 7 - menú
// dinámico) carga su encabezado correcto, su tabla/empty-state (o el
// contenido propio de la vista), no tira errores de consola, y el bloque de
// encabezado+acciones se ve igual que la última referencia (snapshot).
const COMPANY_VIEWS: { path: string; heading: string }[] = [
  { path: '/', heading: 'Panel principal' },
  { path: '/seguridad/usuarios', heading: 'Usuarios' },
  { path: '/configuracion/tiendas', heading: 'Tiendas' },
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
  { path: '/estadisticas', heading: 'Estadísticas' },
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

// Exclusivos del Super Administrador: "Empresas" y "Roles y accesos". Las
// "Tiendas" sí: el admin de empresa administra las de SU empresa (seeder
// 20260919120000-restrict-admin-scope-to-own-company.js).
test('el menú de un admin de empresa no muestra "Empresas" ni "Roles y accesos"', async ({ page }) => {
  await page.goto('/');
  await openMenuGroup(page, 'Configuración');
  const sidebar = page.locator('[data-slot="sidebar"]');
  await expect(sidebar.getByRole('link', { name: 'Tiendas', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Empresas', exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Roles y accesos', exact: true })).toHaveCount(0);
});

// Pedido explícito del usuario: "agrupa el menú en sub menú para tener más
// orden". Grupos Ventas / Finanzas / Configuración; solo arranca abierto el
// de la pantalla actual.
test('el menú agrupa los módulos y abre solo el grupo de la pantalla actual', async ({ page }) => {
  await page.goto('/clientes');
  const sidebar = page.locator('[data-slot="sidebar"]');
  const group = (name: string) => sidebar.getByRole('button', { name, exact: true });

  await expect(group('Ventas')).toHaveAttribute('aria-expanded', 'true');
  await expect(group('Finanzas')).toHaveAttribute('aria-expanded', 'false');
  await expect(group('Configuración')).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar.getByRole('link', { name: 'Clientes', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Caja', exact: true })).toHaveCount(0);

  await group('Finanzas').click();
  await sidebar.getByRole('link', { name: 'Caja', exact: true }).click();
  await expect(page).toHaveURL(/\/caja$/);
  await expect(page.locator('h1', { hasText: 'Caja' })).toBeVisible();

  // Un ítem y su sub-pantalla son hermanos dentro del grupo: solo se marca la actual.
  await page.goto('/productos/tecnicas');
  await expect(sidebar.getByRole('link', { name: 'Técnicas de personalización' })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Lista de precios', exact: true })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('vista Panel principal se ve bien (snapshot del encabezado)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  await expect(page.locator('h1', { hasText: 'Panel principal' }).locator('xpath=..')).toHaveScreenshot(
    'dashboard-header.png',
  );
});

// Con el menú colapsado (solo íconos), los íconos quedan centrados con el
// botón de colapsar. Bug real: el Tooltip con asChild convertía en texto la
// función className del enlace, que perdía sus estilos y se corría 6 px a la
// derecha (el botón y las líneas divisorias parecían "más atrás").
test('el menú colapsado alinea los íconos con el botón de colapsar', async ({ page }) => {
  await page.goto('/caja');
  const sidebar = page.locator('[data-slot="sidebar"]');
  // El del menú lateral: la barra superior tiene otro (el del celular, oculto acá).
  await sidebar.locator('[data-slot="sidebar-trigger"]').click();
  await expect(sidebar).toHaveAttribute('data-state', 'collapsed');

  const centerX = async (locator: Locator) => {
    const box = await locator.boundingBox();
    if (!box) throw new Error('Elemento sin caja visible');
    return box.x + box.width / 2;
  };
  const triggerCenter = await centerX(sidebar.locator('[data-slot="sidebar-trigger"] svg'));
  const icons = await sidebar.locator('[data-slot="sidebar-content"] a svg').all();
  expect(icons.length).toBeGreaterThan(3);
  for (const icon of icons) {
    expect(Math.abs((await centerX(icon)) - triggerCenter)).toBeLessThan(1);
  }

  // Sin texto visible, cada enlace conserva su nombre (aria-label) y la
  // pantalla actual sigue marcada.
  await expect(sidebar.getByRole('link', { name: 'Caja', exact: true })).toHaveAttribute('aria-current', 'page');
});
