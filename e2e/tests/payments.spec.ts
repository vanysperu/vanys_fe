import { expect, test } from '@playwright/test';

import { ADMIN_STATE, GESTOR_STATE } from '../auth';
import { stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Pagos', () => {
  test('la vista se ve bien (snapshot del encabezado)', async ({ page }) => {
    await page.goto('/pagos');
    await expect(page.locator('h1', { hasText: 'Pagos' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('h1', { hasText: 'Pagos' }).locator('xpath=../..')).toHaveScreenshot('payments-header.png');
  });

  test('un pago registrado en una cotización aparece en /pagos, se puede editar y anular', async ({ page }) => {
    const suffix = stamp();
    const clientName = `QA Cliente Pagos ${wordStamp()}`;
    const productName = `QA Producto Pagos ${suffix}`;
    const techniqueName = `QA Técnica Pagos ${suffix}`;

    // Crear una cotización completa (mismo flujo que quotations.spec.ts).
    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', clientName);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', productName);
    await page.fill('#quick-product-price-unit', '20');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

    await page.click('button[title="Nueva técnica"]');
    await page.fill('#quick-technique-name', techniqueName);
    await page.fill('#quick-technique-value', '5');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

    // Abrir el detalle y registrar un pago en la pestaña "Pagos".
    await page.click('button:has-text("Lista")');
    await page.click(`span:has-text("${clientName}")`);
    await expect(page.locator('div[role="dialog"]', { hasText: /^Cotización #/ })).toBeVisible();

    await page.click('div[role="dialog"] [role="tab"]:has-text("Pagos")');
    await page.click('div[role="dialog"] button:has-text("Registrar pago")');
    await page.fill('#payment-amount', '80');
    await page.click('#payment-method');
    await page.locator('[role="option"]', { hasText: 'Efectivo' }).first().click();
    await page.click('div[role="dialog"] button:has-text("Guardar pago")');
    await expect(page.locator('text=Pago registrado')).toBeVisible({ timeout: 10_000 });

    await page.keyboard.press('Escape');

    // Debe aparecer en el listado único de pagos de toda la empresa.
    await page.goto('/pagos');
    const row = page.locator('tr', { hasText: clientName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('S/ 80.00');

    // Editar: cambiar el monto.
    await row.locator('button[title="Editar pago"]').click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar pago' })).toBeVisible();
    await page.fill('#payment-amount', '95');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Pago actualizado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: clientName })).toContainText('S/ 95.00');

    // Anular — ToggleStatusButton no pide confirmación.
    const updatedRow = page.locator('tr', { hasText: clientName });
    await updatedRow.getByRole('button', { name: 'Deshabilitar pago' }).click();
    await expect(page.locator('text=Pago anulado')).toBeVisible({ timeout: 10_000 });
    await expect(updatedRow).toContainText('Anulado');
  });
});

test.describe('Pagos — RBAC de Gestor (solo lectura)', () => {
  test.use({ storageState: GESTOR_STATE });

  test('un Gestor ve el listado de pagos pero NUNCA los botones de editar/anular (solo Administrador los tiene)', async ({ page }) => {
    await page.goto('/pagos');
    await expect(page.locator('h1', { hasText: 'Pagos' })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    // Debe haber al menos una fila (test anterior de Administrador ya dejó
    // pagos registrados en esta misma empresa QA).
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    await expect(page.locator('button[title="Editar pago"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Deshabilitar pago' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Habilitar pago' })).toHaveCount(0);
  });
});
