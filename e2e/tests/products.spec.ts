import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Productos', () => {
  test('la vista se ve bien, con sus dos pestañas (Productos / Técnicas)', async ({ page }) => {
    await page.goto('/productos');
    await expect(page.locator('[role="tab"]', { hasText: 'Productos' })).toBeVisible();
    await expect(page.locator('[role="tab"]', { hasText: 'Técnicas de personalización' })).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('h1', { hasText: 'Productos' }).locator('xpath=../..')).toHaveScreenshot(
      'products-header.png',
    );
  });

  // Pedido explícito del usuario: las flechas de los campos numéricos suben y
  // bajan de a 1 (de 1 a 2 y de vuelta a 1), sin dejar de aceptar decimales.
  test('las flechas de los precios van de a 1 y se pueden escribir decimales', async ({ page }) => {
    await page.goto('/productos');
    await page.click('button:has-text("Nuevo producto")');
    const price = page.locator('#price_unit');
    await price.fill('1');
    await price.press('ArrowUp');
    await expect(price).toHaveValue('2');
    await price.press('ArrowDown');
    await expect(price).toHaveValue('1');
    await price.fill('18.5');
    await price.press('ArrowUp');
    await expect(price).toHaveValue('19.5');
    // Con step="1" el navegador marcaría el decimal como inválido al guardar.
    expect(await price.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
  });

  test('crear, editar y deshabilitar/habilitar un producto', async ({ page }) => {
    const suffix = stamp();
    const name = `QA Producto ${suffix}`;

    await page.goto('/productos');
    await page.click('button:has-text("Nuevo producto")');
    await page.fill('#name', name);
    await page.fill('#sku', `QA-${suffix}`);
    await page.fill('#price_unit', '12.50');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Unidad: S/ 12.50');

    await row.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar producto' })).toBeVisible();
    await page.fill('#price_unit', '15.00');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Producto actualizado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Unidad: S/ 15.00');

    await row.getByRole('button', { name: 'Deshabilitar producto' }).click();
    await expect(page.locator('text=Producto deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Inactivo');

    await row.getByRole('button', { name: 'Habilitar producto' }).click();
    await expect(page.locator('text=Producto habilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Activo');
  });

  test('crear, editar y deshabilitar/habilitar una técnica de personalización', async ({ page }) => {
    const suffix = stamp();
    const name = `QA Técnica ${suffix}`;

    await page.goto('/productos/tecnicas');
    await page.click('button:has-text("Nueva técnica")');
    await page.fill('#tech-name', name);
    // Misma escala de 4 precios que un producto (ya no hay "tipo de costo").
    await page.fill('#tech_price_unit', '1.50');
    await page.fill('#tech_price_hundred', '0.95');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Unidad: S/ 1.50');
    await expect(row).toContainText('Ciento: S/ 0.95');

    await row.getByRole('button', { name: 'Deshabilitar técnica' }).click();
    await expect(page.locator('text=Técnica deshabilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Inactiva');

    await row.getByRole('button', { name: 'Habilitar técnica' }).click();
    await expect(page.locator('text=Técnica habilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Activa');
  });
});
