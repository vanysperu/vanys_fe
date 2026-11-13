import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import {
  apiJson,
  createDisposableCashCompany,
  loginViaUi,
  openMenuGroup,
  pageAuthToken,
  storedAuthToken,
  waitForToastsToClear,
  wordStamp,
  type DisposableCashCompany,
} from '../helpers';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// Sprint 2, ítem 2: crear un almacén, registrar y confirmar un ingreso, y verlo
// en Stock y en el Kardex. Empresa DESECHABLE con el inventario prendido.
test.describe.configure({ mode: 'serial' });

test.describe('Inventario', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let admin: Page;
  const productName = `Polo Inventario ${wordStamp().slice(0, 6)}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    admin = await context.newPage();
    const superToken = storedAuthToken(SUPERADMIN_STATE);
    company = await createDisposableCashCompany(admin.request, superToken);
    const enabled = await apiJson<Envelope<unknown>>(admin.request, 'put', `/company-feature/${company.companyId}`, superToken, {
      features: { inventory: true },
    });
    expect(enabled.status).toBe(200);
    await loginViaUi(admin, company.adminEmail, company.password);
    const token = await pageAuthToken(admin);
    const product = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/product/create', token, {
      company_id: company.companyId,
      name: productName,
      price_unit: 15,
    });
    expect(product.status).toBe(201);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. crea un almacén desde el menú Inventario', async () => {
    await openMenuGroup(admin, 'Inventario');
    await admin.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Almacenes' }).click();
    await expect(admin).toHaveURL('/inventario/almacenes');
    await admin.getByRole('button', { name: 'Nuevo almacén' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Nuevo almacén' });
    await dialog.getByRole('combobox', { name: 'Tienda' }).click();
    await admin.getByRole('option').first().click();
    await dialog.locator('#warehouse-code').fill('PRIN');
    await dialog.locator('#warehouse-name').fill('Almacén principal');
    await dialog.getByRole('button', { name: 'Crear almacén' }).click();
    await expect(admin.getByText('Almacén creado')).toBeVisible({ timeout: 10_000 });
    await expect(admin.locator('tr', { hasText: 'Almacén principal' })).toContainText('Predeterminado');
  });

  test('2. registra y confirma un ingreso con costo', async () => {
    await admin.goto('/inventario/documentos');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Ingreso', exact: true }).click();
    const dialog = admin.getByRole('dialog', { name: 'Nuevo ingreso' });
    await dialog.getByRole('combobox', { name: 'Almacén' }).click();
    await admin.getByRole('option', { name: /Almacén principal/ }).click();
    await dialog.getByRole('combobox', { name: 'Motivo' }).click();
    await admin.getByRole('option', { name: 'Inventario inicial' }).click();

    const line = dialog.getByTestId('document-line').first();
    await line.getByRole('combobox').first().click();
    const popover = admin.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill(productName);
    await popover.locator('[cmdk-item]', { hasText: productName }).first().click();
    await line.getByLabel('Cantidad de la fila 1').fill('25');
    await line.getByLabel('Costo de la fila 1').fill('9.5');
    await dialog.getByRole('button', { name: 'Guardar y confirmar' }).click();
    await expect(admin.getByText('Documento confirmado')).toBeVisible({ timeout: 10_000 });
    await expect(admin.getByRole('dialog', { name: /Ingreso NI01-/ })).toContainText('Confirmado');
  });

  test('3. el stock y el kardex muestran el ingreso', async () => {
    await admin.goto('/inventario/stock');
    const row = admin.locator('tr', { hasText: productName });
    await expect(row).toContainText('25');
    await expect(row).toContainText('S/ 9.50');

    await admin.goto('/inventario/kardex');
    await admin.getByRole('combobox').first().click();
    const popover = admin.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill(productName);
    await popover.locator('[cmdk-item]', { hasText: productName }).first().click();
    await expect(admin.getByTestId('kardex-balances')).toContainText('Saldo final: 25');
    await expect(admin.locator('tr', { hasText: 'NI01-' })).toContainText('Inventario inicial');
  });
});
