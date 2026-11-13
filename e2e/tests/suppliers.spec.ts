import { expect, test } from '@playwright/test';

import { ADMIN_STATE, SUPERADMIN_STATE } from '../auth';
import { openMenuGroup, stamp, wordStamp } from '../helpers';

// Sprint 2, base común: módulo Proveedores (D7), códigos de producto con su
// proveedor (D6) y funcionalidades por empresa.
test.describe('Proveedores', () => {
  test.use({ storageState: ADMIN_STATE });

  test('catálogo: crear, editar y deshabilitar; el código de un producto elige el proveedor', async ({ page }) => {
    const name = `QA Importadora ${wordStamp().slice(0, 8)}`;
    await page.goto('/');
    await openMenuGroup(page, 'Ventas');
    await page.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Proveedores' }).click();
    await expect(page).toHaveURL('/proveedores');

    await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo proveedor' });
    await dialog.locator('#supplier-name').fill(name);
    await dialog.locator('#supplier-email').fill('ventas@importadora.test');
    await dialog.getByRole('button', { name: 'Crear proveedor' }).click();
    await expect(page.getByText('Proveedor creado correctamente')).toBeVisible({ timeout: 10_000 });

    await page.getByPlaceholder('Buscar...').fill(name);
    const row = page.locator('tr', { hasText: name });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: `Editar ${name}` }).click();
    const edit = page.getByRole('dialog', { name: 'Editar proveedor' });
    await edit.locator('#supplier-trade-name').fill('Importadora QA');
    await edit.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Proveedor actualizado correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(row).toContainText('Importadora QA');

    // Producto con un código de ese proveedor.
    const productName = `QA Producto Proveedor ${stamp()}`;
    const code = `QA-${stamp()}`;
    await page.goto('/productos');
    await page.getByRole('button', { name: 'Nuevo producto' }).click();
    const productDialog = page.getByRole('dialog', { name: 'Nuevo producto' });
    await productDialog.locator('#name').fill(productName);
    await productDialog.locator('#price_unit').fill('10');
    await productDialog.getByLabel('Código nuevo').fill(code);
    await productDialog.getByRole('combobox').filter({ hasText: 'Proveedor (opcional)' }).click();
    const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill(name);
    await popover.locator('[cmdk-item]', { hasText: name }).first().click();
    await productDialog.getByRole('button', { name: 'Agregar' }).last().click();
    await expect(productDialog.getByTestId('product-codes')).toContainText(`${code} · ${name}`);
    await productDialog.getByRole('button', { name: 'Crear producto' }).click();
    await expect(page.getByText('Producto creado correctamente')).toBeVisible({ timeout: 10_000 });

    // Deshabilitar el proveedor desde su catálogo.
    await page.goto('/proveedores');
    await page.getByPlaceholder('Buscar...').fill(name);
    await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Deshabilitar proveedor' }).click();
    await expect(page.getByText('Proveedor deshabilitado')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: name })).toContainText('Inactivo');
  });
});

test.describe('Funcionalidades por empresa', () => {
  test.use({ storageState: SUPERADMIN_STATE });

  test('el Super Administrador las ve y las cambia desde Empresas', async ({ page }) => {
    await page.goto('/configuracion/apariencia-empresas');
    // Cualquier empresa sirve: el interruptor se deja como estaba.
    const row = page.locator('tbody tr').first();
    await row.getByRole('button', { name: /^Funcionalidades de/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Funcionalidades' });
    const toggle = dialog.getByRole('switch', { name: 'Stock de proveedores' });
    await expect(toggle).toBeVisible();

    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', before === 'true' ? 'false' : 'true');
    // Se deja como estaba.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', before ?? 'false');
  });
});
