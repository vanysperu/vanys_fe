import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSearchableSelect, pickDate, stamp, businessTodayDay } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Caja', () => {
  test('la vista se ve bien (encabezado + totales + tabla)', async ({ page }) => {
    await page.goto('/caja');
    await expect(page.locator('text=Ingresos (esta página)')).toBeVisible();
    await expect(page.locator('text=Egresos (esta página)')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('h1', { hasText: 'Caja' }).locator('xpath=../..')).toHaveScreenshot('cash-header.png');
  });

  test('registrar un movimiento manual de ingreso y verlo listado', async ({ page }) => {
    const suffix = stamp();
    const description = `QA movimiento ${suffix}`;

    await page.goto('/caja');
    await page.click('button:has-text("Nuevo movimiento")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    const typeTrigger = page.locator('div[role="dialog"]').locator('div.space-y-2', { hasText: 'Tipo' }).locator('button[role="combobox"]');
    await typeTrigger.click();
    await page.locator('[role="option"]', { hasText: 'Ingreso' }).click();

    await chooseSearchableSelect(page, 'Categoría', 'Otro ingreso');
    await page.fill('#cash-movement-amount', '150.00');
    // Fecha de HOY (Lima): la lista ordena por fecha desc, así el movimiento
    // queda en la primera página aunque haya muchos de días anteriores.
    await pickDate(page, 'cash-movement-date', businessTodayDay());
    await page.fill('#cash-movement-description', description);
    await page.click('div[role="dialog"] button:has-text("Registrar movimiento")');
    await expect(page.locator('text=Movimiento registrado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: description })).toBeVisible();
  });

  test('el modal se limpia al cerrarlo sin guardar y volver a abrirlo', async ({ page }) => {
    await page.goto('/caja');
    await page.click('button:has-text("Nuevo movimiento")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    await page.fill('#cash-movement-amount', '50');
    await page.fill('#cash-movement-description', 'drgdrg');
    // Cerrar con la X (no "Registrar"): antes el reset() del modal no
    // limpiaba los <input>/<textarea> nativos (amount, description), solo
    // los campos tipo Select/DateField (bug reportado por QA).
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.locator('div[role="dialog"]')).toBeHidden();

    await page.click('button:has-text("Nuevo movimiento")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('#cash-movement-amount')).toHaveValue('');
    await expect(page.locator('#cash-movement-description')).toHaveValue('');
  });
});
