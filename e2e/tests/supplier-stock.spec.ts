import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import {
  apiJson,
  chooseSearchableSelect,
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

// Sprint 2, ítem 6: una fuente de stock (archivo subido), la pantalla de
// stock y la línea de stock en Nueva cotización. Empresa DESECHABLE con la
// funcionalidad prendida por el Super Administrador.
test.describe.configure({ mode: 'serial' });

test.describe('Stock de proveedores', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let admin: Page;
  const stamp = wordStamp().slice(0, 6).toUpperCase();
  const supplierName = `Importadora QA ${stamp}`;
  const productName = `Taza Stock ${stamp}`;
  const clientName = `Cliente Stock ${wordStamp().slice(0, 6)}`;
  const csv = `codigo;descripcion;stock\nE1000-02${stamp};Taza negra;1.500\nLIBRE${stamp};Sin producto;20\n`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    admin = await context.newPage();
    const superToken = storedAuthToken(SUPERADMIN_STATE);
    company = await createDisposableCashCompany(admin.request, superToken);
    const enabled = await apiJson<Envelope<unknown>>(admin.request, 'put', `/company-feature/${company.companyId}`, superToken, {
      features: { supplier_stock: true },
    });
    expect(enabled.status).toBe(200);

    await loginViaUi(admin, company.adminEmail, company.password);
    const token = await pageAuthToken(admin);
    const supplier = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/supplier/create', token, { name: supplierName });
    expect(supplier.status).toBe(201);
    const product = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/product/create', token, {
      company_id: company.companyId,
      name: productName,
      price_unit: 8,
      codes: [{ code: `E1000.02${stamp}`, supplier_id: supplier.body.data.id }],
    });
    expect(product.status).toBe(201);
    const client = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/client/create', token, {
      company_id: company.companyId,
      name: clientName,
    });
    expect(client.status).toBe(201);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. crea una fuente subiendo el Excel: probar muestra cómo se lee y al crear lee el stock', async () => {
    await openMenuGroup(admin, 'Ventas');
    await admin.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Stock de proveedores' }).click();
    await expect(admin).toHaveURL('/stock-proveedores');
    await admin.getByRole('tab', { name: 'Fuentes' }).click();
    await admin.getByRole('button', { name: 'Nueva fuente' }).click();

    const dialog = admin.getByRole('dialog', { name: 'Nueva fuente de stock' });
    await chooseSearchableSelect(admin, 'Proveedor', supplierName);
    await dialog.locator('#stock-name').fill('CSV QA');
    await dialog.getByRole('radio', { name: /Archivo que se sube/ }).click();
    await dialog.locator('#stock-file').setInputFiles({ name: 'stock.csv', mimeType: 'text/csv', buffer: Buffer.from(csv, 'utf8') });
    await dialog.locator('#stock-code_column').fill('codigo');
    await dialog.locator('#stock-quantity_column').fill('stock');
    await dialog.locator('#stock-description_column').fill('descripcion');
    await dialog.getByRole('button', { name: 'Probar' }).click();
    const preview = dialog.getByTestId('stock-preview');
    await expect(preview).toContainText('2 filas con código');
    await expect(preview).toContainText(`E1000-02${stamp}`);
    await expect(preview).toContainText('1,500');

    await dialog.getByRole('button', { name: 'Crear fuente' }).click();
    await expect(admin.getByText('Stock leído: 2 filas')).toBeVisible({ timeout: 15_000 });
    await expect(admin.locator('tr', { hasText: 'CSV QA' })).toContainText('Al día');
  });

  test('2. la pantalla de stock muestra cada código, su producto y la columna de la fuente', async () => {
    await admin.getByRole('tab', { name: 'Stock' }).click();
    const row = admin.locator('tr', { hasText: `E1000-02${stamp}` });
    await expect(row).toContainText(productName);
    await expect(row).toContainText('1,500');
    // Una columna por fuente, con su nombre.
    await expect(admin.getByRole('columnheader', { name: 'CSV QA' })).toBeVisible();

    await admin.getByRole('switch', { name: 'Solo códigos sin producto' }).click();
    await expect(admin.locator('tr', { hasText: `LIBRE${stamp}` })).toBeVisible();
    await expect(admin.locator('tr', { hasText: `E1000-02${stamp}` })).toHaveCount(0);
  });

  test('3. en Nueva cotización, debajo del producto se ve el stock de la importadora', async () => {
    await admin.goto('/cotizaciones');
    await waitForToastsToClear(admin);
    await admin.click('button:has-text("Nueva cotización")');
    await chooseSearchableSelect(admin, 'Cliente', clientName);
    await chooseSearchableSelect(admin, 'Producto', productName);

    const line = admin.getByTestId('product-stock-line');
    await expect(line).toContainText('CSV QA:');
    await expect(line).toContainText('1,500');
    await expect(line).toContainText('Total: 1,500');
  });
});
