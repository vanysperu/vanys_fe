import { expect, test } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import { chooseSelect, stamp } from '../helpers';

test.use({ storageState: SUPERADMIN_STATE });

test.describe('Plataforma (Super Administrador) — Empresas y Tiendas', () => {
  test('el sidebar muestra Empresas y Tiendas (exclusivo de plataforma)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slot="sidebar"]', { hasText: 'Empresas' })).toBeVisible();
    await expect(page.locator('[data-slot="sidebar"]', { hasText: 'Tiendas' })).toBeVisible();
  });

  test('la vista de Empresas se ve bien (snapshot del encabezado)', async ({ page }) => {
    await page.goto('/configuracion/apariencia-empresas');
    await expect(page.locator('table')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('h1', { hasText: 'Empresas' }).locator('xpath=../..')).toHaveScreenshot(
      'companies-header.png',
    );
  });

  test('crear una empresa, editarla y deshabilitarla/habilitarla', async ({ page }) => {
    const suffix = stamp();
    const businessName = `QA Empresa ${suffix}`;
    const ruc = `9${suffix.padStart(10, '0')}`.slice(0, 11);

    await page.goto('/configuracion/apariencia-empresas');
    await page.click('button:has-text("Nueva empresa")');
    await page.fill('#ruc', ruc);
    await page.fill('#business_name', businessName);
    await page.click('div[role="dialog"] button:has-text("Crear empresa")');
    await expect(page.locator('text=Empresa creada correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: businessName });
    await expect(row).toBeVisible();

    await row.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar empresa' })).toBeVisible();
    await page.fill('#email', `qa.${suffix}@empresa.test`);
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Empresa actualizada correctamente')).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Deshabilitar empresa' }).click();
    await expect(page.locator('text=Empresa deshabilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Deshabilitada');

    await row.getByRole('button', { name: 'Habilitar empresa' }).click();
    await expect(page.locator('text=Empresa habilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Activa');

    // ---- Tienda para esta misma empresa, usada por el siguiente bloque ----
    await page.goto('/configuracion/tiendas');
    await page.click('button:has-text("Nueva tienda")');
    await page.fill('#business_code', `QA-${suffix}`);
    await chooseSelect(page, 'Empresa', businessName);
    await page.click('div[role="dialog"] button:has-text("Crear tienda")');
    await expect(page.locator('text=Tienda creada correctamente')).toBeVisible({ timeout: 10_000 });

    const storeRow = page.locator('tr', { hasText: `QA-${suffix}` });
    await expect(storeRow).toBeVisible();

    await storeRow.getByRole('button', { name: 'Deshabilitar tienda' }).click();
    await expect(page.locator('text=Tienda deshabilitada')).toBeVisible({ timeout: 10_000 });
    await storeRow.getByRole('button', { name: 'Habilitar tienda' }).click();
    await expect(page.locator('text=Tienda habilitada')).toBeVisible({ timeout: 10_000 });
  });
});
