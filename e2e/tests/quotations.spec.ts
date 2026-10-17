import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSearchableSelect, stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Cotizaciones', () => {
  test('la vista se ve bien en tablero (Kanban) y en lista', async ({ page }) => {
    await page.goto('/cotizaciones');
    await expect(page.locator('h1', { hasText: 'Cotizaciones' })).toBeVisible();
    // Vista por defecto: tablero.
    await expect(page.locator('text=Pendiente').first()).toBeVisible();

    await page.click('button:has-text("Lista")');
    // Puede no haber ninguna cotización todavía (empresa recién creada) — en
    // ese caso la vista de Lista muestra su propio empty-state en vez de la
    // tabla agrupada por estado, igual de válido.
    await expect(
      page.locator('div.overflow-x-auto').or(page.getByText('No se encontraron cotizaciones')).first(),
    ).toBeVisible();
  });

  test('crear una cotización completa usando los botones "+" de creación rápida (cliente, producto y técnica)', async ({
    page,
  }) => {
    const suffix = stamp();
    const clientName = `QA Cliente Cotización ${wordStamp()}`;
    const productName = `QA Producto Cotización ${suffix}`;
    const techniqueName = `QA Técnica Cotización ${suffix}`;

    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await expect(page.locator('div[role="dialog"]', { hasText: 'Nueva cotización' })).toBeVisible();

    // Cliente nuevo desde el "+".
    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', clientName);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

    // Producto nuevo desde el "+", con precio por unidad.
    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', productName);
    await page.fill('#quick-product-price-unit', '20');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

    // Técnica nueva desde el "+".
    await page.click('button[title="Nueva técnica"]');
    await page.fill('#quick-technique-name', techniqueName);
    await page.fill('#quick-technique-value', '5');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

    // Las 3 entidades recién creadas deben quedar auto-seleccionadas en sus
    // respectivos SearchableSelect (bug real corregido esta sesión: Técnica
    // usaba el <Select> nativo de Radix, que no resolvía el label para un
    // <SelectItem> recién montado).
    await expect(page.locator('div[role="dialog"] button[role="combobox"]', { hasText: clientName })).toBeVisible();
    await expect(page.locator('div[role="dialog"] button[role="combobox"]', { hasText: productName })).toBeVisible();
    await expect(page.locator('div[role="dialog"] button[role="combobox"]', { hasText: techniqueName })).toBeVisible();

    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

    // Confirmar que aparece en la vista de Lista.
    await page.click('button:has-text("Lista")');
    await expect(page.locator('span', { hasText: clientName })).toBeVisible();
  });

  test('el detalle de una cotización abre sus 5 pestañas y permite crear una orden de compra', async ({ page }) => {
    const suffix = stamp();
    const clientName = `QA Cliente Detalle ${wordStamp()}`;
    const productName = `QA Producto Detalle ${suffix}`;
    const techniqueName = `QA Técnica Detalle ${suffix}`;

    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', clientName);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', productName);
    await page.fill('#quick-product-price-unit', '30');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

    // technique_id es obligatorio en el schema (quotation.schema.ts) — sin
    // esto el submit queda bloqueado con "Selecciona una técnica de
    // personalización".
    await page.click('button[title="Nueva técnica"]');
    await page.fill('#quick-technique-name', techniqueName);
    await page.fill('#quick-technique-value', '5');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

    await page.click('button:has-text("Lista")');
    await page.click(`span:has-text("${clientName}")`);
    await expect(page.locator('div[role="dialog"]', { hasText: /^Cotización #/ })).toBeVisible();

    for (const tab of ['Productos', 'Pagos', 'Gastos', 'Compras', 'Historial']) {
      await page.click(`div[role="dialog"] [role="tab"]:has-text("${tab}")`);
      await expect(page.locator(`div[role="dialog"] [role="tab"]:has-text("${tab}")`)).toHaveAttribute(
        'data-state',
        'active',
      );
    }

    // El loop termina en "Historial" — Radix Tabs desmonta el contenido de
    // la pestaña inactiva, así que hay que volver a "Compras" antes de
    // buscar su botón.
    await page.click('div[role="dialog"] [role="tab"]:has-text("Compras")');

    // Crear una orden de compra asignada al propio admin logueado (siempre
    // existe y pertenece a la misma empresa).
    await page.click('div[role="dialog"] button:has-text("Crear orden de compra")');
    await page.locator('div[role="dialog"] label', { hasText: productName }).click();
    await chooseSearchableSelect(page, 'Asignado a', 'Ana Acme');
    await page.click('div[role="dialog"] button:has-text("Crear orden")');
    await expect(page.locator('text=Orden de compra creada')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('div[role="dialog"]')).toContainText('Ana Acme');
  });
});
