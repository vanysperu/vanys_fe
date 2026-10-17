import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSearchableSelect, pickDate, stamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

/**
 * Contraparte de UI de los guards agregados en el backend tras la auditoría
 * de flujo. No repiten lo que ya cubren los tests de API (grulla_be/tests):
 * acá se verifica que la pantalla acompañe la regla, no que la regla exista.
 */
test.describe('Guards de flujo', () => {
  test('un producto deshabilitado deja de ofrecerse al armar una cotización nueva', async ({ page }) => {
    const suffix = stamp();
    const name = `QA Retirado ${suffix}`;

    // Producto nuevo y activo.
    await page.goto('/productos');
    await page.click('button:has-text("Nuevo producto")');
    await page.fill('#name', name);
    await page.fill('#sku', `QA-${suffix}`);
    await page.fill('#price_unit', '30');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();

    // Mientras está activo, sí aparece como opción en la cotización.
    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await expect(page.locator('div[role="dialog"]', { hasText: 'Nueva cotización' })).toBeVisible();
    await expect(await productOptionCount(page, name)).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    // Se deshabilita.
    await page.goto('/productos');
    const rowAgain = page.locator('tr', { hasText: name });
    await rowAgain.getByRole('button', { name: 'Deshabilitar producto' }).click();
    await expect(page.locator('text=Producto deshabilitado')).toBeVisible({ timeout: 10_000 });

    // Y ya no se ofrece: el backend rechaza cotizarlo, así que la pantalla
    // tampoco debe permitir elegirlo (si no, el usuario llenaría todo el
    // formulario para recibir un error recién al guardar).
    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await expect(page.locator('div[role="dialog"]', { hasText: 'Nueva cotización' })).toBeVisible();
    expect(await productOptionCount(page, name)).toBe(0);
  });

  test('un movimiento de caja se puede anular y desaparece del listado', async ({ page }) => {
    const suffix = stamp();
    const description = `QA anulable ${suffix}`;

    await page.goto('/caja');
    await page.click('button:has-text("Nuevo movimiento")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    const typeTrigger = page
      .locator('div[role="dialog"]')
      .locator('div.space-y-2', { hasText: 'Tipo' })
      .locator('button[role="combobox"]');
    await typeTrigger.click();
    await page.locator('[role="option"]', { hasText: 'Egreso' }).click();

    await chooseSearchableSelect(page, 'Categoría', 'Otro egreso');
    await page.fill('#cash-movement-amount', '77.50');
    await pickDate(page, 'cash-movement-date', 15);
    await page.fill('#cash-movement-description', description);
    await page.click('div[role="dialog"] button:has-text("Registrar movimiento")');
    await expect(page.locator('text=Movimiento registrado correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: description });
    await expect(row).toBeVisible();

    // La anulación ahora corre dentro de una transacción que además escribe
    // el historial — este test cubre que el flujo siga funcionando de punta
    // a punta desde la pantalla.
    await row.getByRole('button', { name: 'Deshabilitar movimiento' }).click();
    await expect(page.locator('text=Movimiento deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: description })).toHaveCount(0);
  });

  test('el formulario de usuario no ofrece el rol de plataforma a un admin de empresa', async ({ page }) => {
    await page.goto('/seguridad/usuarios');
    await page.click('button:has-text("Nuevo usuario")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    const field = page.locator('div.space-y-2', { hasText: 'Rol' }).last();
    await field.locator('button[role="combobox"]').first().click();

    // Roles plantilla sí; "Super Administrador" (is_system) no — el backend
    // ahora responde 403 si se intenta asignar, así que la UI tampoco debe
    // ofrecerlo.
    await expect(page.locator('[role="option"]', { hasText: /^Administrador$/ })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: 'Super Administrador' })).toHaveCount(0);
  });
});

// Cuenta cuántas opciones del SearchableSelect de "Producto" coinciden con
// el nombre buscado, dejando el popover cerrado al salir.
async function productOptionCount(page: import('@playwright/test').Page, name: string): Promise<number> {
  const label = page.locator('label', { hasText: /^Producto$/ }).last();
  const trigger = label.locator('xpath=..').locator('button[role="combobox"]').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
  await popover.waitFor({ state: 'visible' });
  await popover.locator('[cmdk-input]').fill(name);
  await page.waitForTimeout(600); // el buscador filtra contra el backend

  const count = await popover.locator('[cmdk-item]', { hasText: name }).count();
  await page.keyboard.press('Escape');
  return count;
}
