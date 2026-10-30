import { expect, test } from '@playwright/test';

import { ADMIN_STATE, SUPERADMIN_STATE } from '../auth';
import { chooseSelect, openMenuGroup, stamp } from '../helpers';

// "Roles y accesos" es exclusivo del Super Administrador (pedido explícito
// del usuario): el backend lo exige con requireSystemRole y no lo incluye en
// el menú de un usuario de empresa.
test.describe('Roles y accesos (Super Administrador)', () => {
  test.use({ storageState: SUPERADMIN_STATE });

  test('la vista se ve bien y lista los roles con su empresa', async ({ page }) => {
    await page.goto('/seguridad/roles-accesos');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th', { hasText: 'Empresa' })).toBeVisible();
    // Por nombre: con muchos roles de prueba acumulados, la plantilla puede
    // quedar fuera de la primera página.
    await page.getByPlaceholder('Filtrar...').first().fill('Especialista');
    const templateRow = page.locator('tr', { hasText: 'Especialista' }).first();
    await expect(templateRow).toContainText('Todas (plantilla)');
    await page.waitForTimeout(500);
    // Snapshot acotado al encabezado (no página completa): la cantidad de
    // filas crece entre corridas (roles QA que quedan de pruebas previas).
    await expect(page.locator('h1', { hasText: 'Roles y accesos' }).locator('xpath=../..')).toHaveScreenshot(
      'roles-header.png',
    );
  });

  test('el rol de plataforma no se edita ni se deshabilita', async ({ page }) => {
    await page.goto('/seguridad/roles-accesos');
    await page.getByPlaceholder('Filtrar...').first().fill('Super Administrador');
    const systemRow = page.locator('tr', { hasText: 'Super Administrador' }).first();
    await expect(systemRow).toBeVisible();
    await expect(systemRow.getByRole('button', { name: /Deshabilitar rol|Habilitar rol/ })).toHaveCount(0);
    // Solo queda "Gestionar accesos" (todo otorgado, de solo lectura).
    await expect(systemRow.locator('button')).toHaveCount(1);
  });

  test('una plantilla compartida se puede editar, avisando que alcanza a todas las empresas', async ({ page }) => {
    await page.goto('/seguridad/roles-accesos');
    await page.getByPlaceholder('Filtrar...').first().fill('Especialista');
    const templateRow = page.locator('tr', { hasText: 'Especialista' }).first();
    await templateRow.locator('button').first().click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('se aplica a todos los usuarios de todas las empresas');
    // Editable: aparece "Guardar cambios" (deshabilitado hasta que se marque algo).
    await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  });

  test('crear un rol para una empresa, editarlo y deshabilitarlo/habilitarlo', async ({ page }) => {
    const roleName = `QA Rol ${stamp()}`;

    await page.goto('/seguridad/roles-accesos');
    await page.click('button:has-text("Nuevo rol")');
    await page.fill('#name', roleName);
    await page.fill('#description', 'Rol creado por la suite automatizada');
    await chooseSelect(page, 'Empresa', 'Acme Corp QA');
    await page.click('div[role="dialog"] button:has-text("Crear rol")');
    await expect(page.locator('text=Rol creado correctamente')).toBeVisible({ timeout: 10_000 });

    // Se filtra por el nombre (también encuentra la versión "editado").
    await page.getByPlaceholder('Filtrar...').first().fill(roleName);
    const row = page.locator('tr', { hasText: roleName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('Acme Corp QA');

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

    // Inactivo: ni editar ni gestionar accesos hasta reactivarlo (bug
    // reportado por QA).
    await expect(editedRow.getByRole('button', { name: 'Editar rol' })).toBeDisabled();
    await expect(editedRow.getByRole('button', { name: 'Gestionar accesos' })).toBeDisabled();

    await editedRow.getByRole('button', { name: 'Habilitar rol' }).click();
    await expect(page.locator('text=Rol habilitado')).toBeVisible({ timeout: 10_000 });
    await expect(editedRow).toContainText('Activo');
    await expect(editedRow.getByRole('button', { name: 'Editar rol' })).toBeEnabled();
    await expect(editedRow.getByRole('button', { name: 'Gestionar accesos' })).toBeEnabled();
  });
});

test.describe('Roles y accesos — fuera del alcance de un Administrador de empresa', () => {
  test.use({ storageState: ADMIN_STATE });

  test('no aparece en su menú y la URL directa lo devuelve al inicio', async ({ page }) => {
    await page.goto('/');
    await openMenuGroup(page, 'Configuración');
    const sidebar = page.locator('[data-slot="sidebar"]');
    // Control positivo: el grupo está abierto y muestra lo que sí administra.
    await expect(sidebar.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Roles y accesos' })).toHaveCount(0);

    await page.goto('/seguridad/roles-accesos');
    await expect(page).toHaveURL('/');
  });

  test('sigue pudiendo elegir el rol al crear un usuario', async ({ page }) => {
    await page.goto('/seguridad/usuarios');
    await page.click('button:has-text("Nuevo usuario")');
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    // GET /role/list ahora cuelga del módulo Usuarios (users.roleOptions.endpoint).
    await dialog.getByRole('combobox').filter({ hasText: 'Selecciona un rol' }).click();
    await expect(page.locator('[role="option"]', { hasText: 'Gestor' }).first()).toBeVisible();
    // Nunca el rol de plataforma.
    await expect(page.locator('[role="option"]', { hasText: 'Super Administrador' })).toHaveCount(0);
  });
});
