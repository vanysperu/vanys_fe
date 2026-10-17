import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Clientes', () => {
  test('la vista se ve bien (snapshot del encabezado)', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.locator('table')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('h1', { hasText: 'Clientes' }).locator('xpath=../..')).toHaveScreenshot(
      'clients-header.png',
    );
  });

  test('crear, editar y deshabilitar/habilitar un cliente', async ({ page }) => {
    const suffix = stamp();
    const name = `QA Cliente ${wordStamp()}`;

    await page.goto('/clientes');
    await page.click('button:has-text("Nuevo cliente")');
    await page.fill('#name', name);
    await page.fill('#email', `qa.cliente.${suffix}@example.test`);
    await page.fill('#phone', '987654321');
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();

    await row.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar cliente' })).toBeVisible();
    await page.fill('#phone', '912345678');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Cliente actualizado correctamente')).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Deshabilitar cliente' }).click();
    await expect(page.locator('text=Cliente deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Inactivo');

    await row.getByRole('button', { name: 'Habilitar cliente' }).click();
    await expect(page.locator('text=Cliente habilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Activo');
  });

  test('buscar filtra el listado y ordenar por nombre no rompe la tabla', async ({ page }) => {
    await page.goto('/clientes');
    await page.click('th:has-text("Nombre")');
    await expect(page.locator('table')).toBeVisible();

    await page.fill('input[placeholder="Buscar..."]', 'zzzz-no-deberia-existir-zzzz');
    await expect(page.locator('text=No se encontraron clientes')).toBeVisible();
  });
});
