import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Documentos de la empresa', () => {
  test('la vista se ve bien (datos de empresa + cuentas de pago)', async ({ page }) => {
    await page.goto('/configuracion/documentos');
    await expect(page.locator('text=Datos de la empresa')).toBeVisible();
    await expect(page.locator('text=Cuentas de pago (bancos, Yape, Plin)')).toBeVisible();
  });

  test('actualizar la razón social y guardar', async ({ page }) => {
    await page.goto('/configuracion/documentos');
    const nameInput = page.locator('#business_name');
    await expect(nameInput).toBeVisible();
    const original = await nameInput.inputValue();

    await nameInput.fill(`${original} QA`);
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Documentos actualizados')).toBeVisible({ timeout: 10_000 });

    // Restaura el valor original para no ensuciar los datos de la empresa
    // semilla entre corridas.
    await nameInput.fill(original);
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Documentos actualizados')).toBeVisible({ timeout: 10_000 });
  });

  test('agregar una cuenta de pago y eliminarla', async ({ page }) => {
    const suffix = stamp();
    const accountName = `QA Cuenta ${suffix}`;

    await page.goto('/configuracion/documentos');
    await page.click('button:has-text("Agregar cuenta")');
    // chooseSelect no aplica acá: este form usa `div.space-y-1` para "Tipo"
    // (no `space-y-2`, a diferencia de la mayoría de formularios) — se
    // escopea directo al único form con el campo "Número de cuenta".
    const accountForm = page.locator('form:has(#account-ref1)');
    await accountForm.locator('button[role="combobox"]').click();
    await page.locator('[role="option"]', { hasText: 'Yape' }).click();
    await page.fill('#account-name', accountName);
    await page.fill('#account-ref1', '987654321');
    await page.locator('form:has(#account-ref1) button:has-text("Guardar")').click();
    await expect(page.locator('text=Cuenta agregada')).toBeVisible({ timeout: 10_000 });

    // El botón de eliminar es HERMANO del bloque de texto (nombre/tipo), no
    // su descendiente — `div,{hasText}].last()` agarra el div interno que
    // solo envuelve el texto y nunca encuentra el botón ahí adentro. `has`
    // filtra a los divs que SÍ contienen un botón como descendiente (evita
    // además encadenar `xpath=` con un selector CSS, combinación que acá se
    // quedaba esperando para siempre sin loguear ningún otro chequeo).
    const accountRow = page
      .locator('div', { hasText: accountName })
      .filter({ has: page.locator('button') })
      .last();
    await expect(accountRow).toBeVisible();
    await accountRow.locator('button').click();
    await expect(page.locator('p', { hasText: accountName })).toHaveCount(0);
  });
});
