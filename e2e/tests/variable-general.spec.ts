import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Variables generales', () => {
  test('la vista se ve bien (snapshot del encabezado)', async ({ page }) => {
    await page.goto('/configuracion/variables-generales');
    await expect(page.locator('table')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('h1', { hasText: 'Generales' }).locator('xpath=../..')).toHaveScreenshot(
      'variable-general-header.png',
    );
  });

  test('crear una variable con categoría nueva (allowCustomValue), editarla y deshabilitarla/habilitarla', async ({
    page,
  }) => {
    const suffix = stamp();
    const category = `qa_categoria_${suffix}`;
    const title = `QA Título ${suffix}`;
    const name = `QA Nombre ${suffix}`;

    await page.goto('/configuracion/variables-generales');
    await page.click('button:has-text("Nueva variable")');

    const categoryTrigger = page.locator('#category');
    await categoryTrigger.click();
    const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill(category);
    // SearchableSelect imprime "Usar "..."" con comillas tipográficas
    // (&ldquo;/&rdquo;), no comillas rectas — se matchea solo por el texto
    // de la categoría para no depender del carácter exacto de la comilla.
    await popover.locator('[cmdk-item]', { hasText: category }).click();

    await page.fill('#title', title);
    await page.fill('#prefix_id', `qa_${suffix}`);
    await page.fill('#name', name);
    await page.click('div[role="dialog"] button:has-text("Crear variable")');
    await expect(page.locator('text=Variable creada correctamente')).toBeVisible({ timeout: 10_000 });

    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText(category);

    await row.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar variable general' })).toBeVisible();
    await page.fill('#description', 'Descripción de prueba QA');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Variable actualizada correctamente')).toBeVisible({ timeout: 10_000 });

    await row.getByRole('button', { name: 'Deshabilitar variable' }).click();
    await expect(page.locator('text=Variable deshabilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Inactiva');

    await row.getByRole('button', { name: 'Habilitar variable' }).click();
    await expect(page.locator('text=Variable habilitada')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Activa');
  });
});
