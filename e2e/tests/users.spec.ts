import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSelect, chooseSelectExact, stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Usuarios', () => {
  test('la vista se ve bien (snapshot del encabezado + tabla)', async ({ page }) => {
    await page.goto('/seguridad/usuarios');
    await expect(page.locator('table')).toBeVisible();
    await page.waitForTimeout(500);
    // Acotado al encabezado (no página completa): el número de usuarios
    // crece entre corridas y desplaza todo lo que va debajo de la tabla
    // aunque el tbody esté enmascarado.
    await expect(page.locator('h1', { hasText: 'Usuarios' }).locator('xpath=../..')).toHaveScreenshot(
      'users-header.png',
    );
  });

  test('crear, editar (incluido el rol) y deshabilitar/habilitar un usuario', async ({ page }) => {
    const suffix = stamp();
    const email = `qa.user.${suffix}@acme.test`;
    // El campo "Nombre" filtra en vivo solo letras (lettersFilter,
    // UsersListPage.tsx) — un sufijo numérico se descarta al escribir y deja
    // a todos los usuarios de prueba con el mismo nombre literal.
    const fullName = `QaUser${wordStamp()}`;
    const dni = suffix.padStart(8, '0').slice(0, 8);

    await page.goto('/seguridad/usuarios');
    await page.click('button:has-text("Nuevo usuario")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    await page.fill('#name', fullName);
    await page.fill('#paternal_lastname', 'Apellido');
    await page.fill('#email', email);
    // Día 1 del mes actual — siempre en el pasado (nunca choca con
    // disableFuture del DateField, a diferencia de un día fijo como "15" que
    // puede caer después de "hoy" según la fecha real de la corrida).
    await page.click('#date_of_birth');
    const calendar = page.locator('[data-slot="popover-content"][data-state="open"]');
    await calendar.waitFor({ state: 'visible' });
    await calendar.locator('button', { hasText: /^1$/ }).first().click();

    await chooseSelect(page, 'Tipo de documento', 'DNI');
    await page.fill('#document_number', dni);
    await chooseSelect(page, 'Género', 'Masculino');
    await page.fill('#phone_number', '987654321');
    await chooseSelect(page, 'Tienda', 'ACME');
    await chooseSelectExact(page, 'Rol', 'Especialista');

    await page.click('div[role="dialog"] button:has-text("Crear usuario")');
    await expect(page.locator('text=Usuario creado')).toBeVisible({ timeout: 10_000 });

    // Editar: cambia el rol de Especialista a Gestor — valida el fix de
    // "roleIds" (antes el backend ignoraba este cambio por completo).
    const row = page.locator('tr', { hasText: fullName });
    await expect(row).toBeVisible();
    await row.locator('button').first().click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Editar usuario' })).toBeVisible();
    await chooseSelectExact(page, 'Rol', 'Gestor');
    await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
    await expect(page.locator('text=Usuario actualizado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: fullName })).toContainText('Gestor');

    // Deshabilitar / habilitar — ToggleStatusButton no pide confirmación,
    // el click dispara el toggle directo (ver ToggleStatusButton.tsx).
    const row2 = page.locator('tr', { hasText: fullName });
    await row2.getByRole('button', { name: 'Deshabilitar usuario' }).click();
    await expect(page.locator('text=Usuario deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row2).toContainText('Inactivo');

    await row2.getByRole('button', { name: 'Habilitar usuario' }).click();
    await expect(page.locator('text=Usuario habilitado')).toBeVisible({ timeout: 10_000 });
    await expect(row2).toContainText('Activo');
  });

  test('buscar por nombre filtra el listado', async ({ page }) => {
    await page.goto('/seguridad/usuarios');
    await page.fill('input[placeholder="Buscar..."]', 'zzzz-no-deberia-existir-zzzz');
    await expect(page.locator('text=No se encontraron usuarios')).toBeVisible();
  });
});
