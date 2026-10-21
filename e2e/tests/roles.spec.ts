import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Roles y accesos', () => {
  test('la vista se ve bien y lista los roles de plantilla + los propios de la empresa', async ({ page }) => {
    await page.goto('/seguridad/roles-accesos');
    await expect(page.locator('table')).toBeVisible();
    // Por nombre: con muchos roles de prueba acumulados, la plantilla puede
    // quedar fuera de la primera página.
    await page.getByPlaceholder('Filtrar...').first().fill('Administrador');
    await expect(page.locator('td', { hasText: 'Administrador' }).first()).toBeVisible();
    await page.waitForTimeout(500);
    // Snapshot acotado al encabezado (no página completa): la cantidad de
    // filas crece entre corridas (roles QA que quedan de pruebas previas),
    // lo que desplaza todo lo que va debajo de la tabla (paginación) aunque
    // el tbody esté enmascarado — mismo criterio que el resto de vistas.
    await expect(page.locator('h1', { hasText: 'Roles y accesos' }).locator('xpath=../..')).toHaveScreenshot(
      'roles-header.png',
    );
  });

  test('un rol de plantilla compartido (Administrador/Especialista/Gestor) no muestra editar/deshabilitar', async ({
    page,
  }) => {
    await page.goto('/seguridad/roles-accesos');
    // Se busca por nombre: con muchos roles de prueba acumulados, la plantilla
    // puede quedar fuera de la primera página.
    await page.getByPlaceholder('Filtrar...').first().fill('Especialista');
    const templateRow = page.locator('tr', { hasText: 'Especialista' }).first();
    await expect(templateRow).toBeVisible();
    // Solo debe quedar el botón de "Gestionar accesos" (KeyRound) — nunca
    // lápiz de editar ni el toggle de deshabilitar (CLAUDE.md sección 10:
    // un admin de empresa no edita/deshabilita un rol compartido).
    await expect(templateRow.getByRole('button', { name: /Deshabilitar rol|Habilitar rol/ })).toHaveCount(0);
  });

  test('ver accesos (solo lectura) de un rol de plantilla', async ({ page }) => {
    await page.goto('/seguridad/roles-accesos');
    // Se busca por nombre: con muchos roles de prueba acumulados, la plantilla
    // puede quedar fuera de la primera página.
    await page.getByPlaceholder('Filtrar...').first().fill('Especialista');
    const templateRow = page.locator('tr', { hasText: 'Especialista' }).first();
    await templateRow.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('div[role="dialog"] button:has-text("Guardar cambios")')).toHaveCount(0);
  });

  test('crear un rol propio de la empresa, editarlo y deshabilitarlo/habilitarlo', async ({ page }) => {
    const roleName = `QA Rol ${stamp()}`;

    await page.goto('/seguridad/roles-accesos');
    await page.click('button:has-text("Nuevo rol")');
    await page.fill('#name', roleName);
    await page.fill('#description', 'Rol creado por la suite automatizada');
    await page.click('div[role="dialog"] button:has-text("Crear rol")');
    await expect(page.locator('text=Rol creado correctamente')).toBeVisible({ timeout: 10_000 });

    // Se filtra por el nombre (también encuentra la versión "editado").
    await page.getByPlaceholder('Filtrar...').first().fill(roleName);
    const row = page.locator('tr', { hasText: roleName });
    await expect(row).toBeVisible();

    // Editar.
    await row.locator('button').nth(1).click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar rol' })).toBeVisible();
    await page.fill('#name', `${roleName} editado`);
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Rol actualizado correctamente')).toBeVisible({ timeout: 10_000 });

    const editedRow = page.locator('tr', { hasText: `${roleName} editado` });
    await expect(editedRow).toBeVisible();

    // Deshabilitar / habilitar.
    await editedRow.getByRole('button', { name: 'Deshabilitar rol' }).click();
    await expect(page.locator('text=Rol deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(editedRow).toContainText('Inactivo');

    await editedRow.getByRole('button', { name: 'Habilitar rol' }).click();
    await expect(page.locator('text=Rol habilitado')).toBeVisible({ timeout: 10_000 });
    await expect(editedRow).toContainText('Activo');
  });
});
