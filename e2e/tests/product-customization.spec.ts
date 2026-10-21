import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// "Requiere personalización" por producto: apagado por defecto. Un producto
// sin personalización se cotiza sin técnica y solo con su precio.
test.describe('Productos con y sin personalización', () => {
  test('en Productos, un producto nuevo nace sin personalización', async ({ page }) => {
    const name = `QA Sin Pers ${stamp()}`;

    await page.goto('/productos');
    await page.click('button:has-text("Nuevo producto")');
    await page.fill('#name', name);
    await page.fill('#price_unit', '3.50');
    await expect(page.locator('#requires_customization')).toHaveAttribute('data-state', 'unchecked');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();
    await expect(row.locator('td').filter({ hasText: /^No$/ })).toBeVisible();

    // Se puede encender al editar.
    await row.locator('button').first().click();
    await page.click('#requires_customization');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Producto actualizado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(row.locator('td').filter({ hasText: /^Sí$/ })).toBeVisible();
  });

  test('en la cotización, un producto sin personalización no pide técnica y cobra solo el producto', async ({ page }) => {
    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');

    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', `QA Cliente Sin Pers ${wordStamp()}`);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

    // Sin marcar "Requiere personalización".
    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', `QA Bolsa ${stamp()}`);
    await page.fill('#quick-product-price-unit', '20');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId('item-no-customization-0')).toHaveText('Sin personalización');
    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
    await expect(page.getByTestId('item-price-breakdown-0')).toHaveText('Producto S/ 20.00 c/u × 10 = S/ 200.00');

    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });
  });
});
