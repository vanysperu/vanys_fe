import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import {
  apiJson,
  createDisposableCashCompany,
  loginViaUi,
  storedAuthToken,
  waitForToastsToClear,
  wordStamp,
  type DisposableCashCompany,
} from '../helpers';

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface StockRow {
  productId: number;
  total: number;
}

// Plan §8.4: al registrar una compra en una tienda con almacén se ofrece
// "Ingresar al almacén X" (preseleccionado el predeterminado de la tienda) y la
// compra entra al stock. Empresa DESECHABLE con el inventario prendido.
test.describe.configure({ mode: 'serial' });

test.describe('Compras: ingresar al almacén', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let gestor: Page;
  let adminToken: string;
  let productId: number;
  const clientName = `Cliente Almacén ${wordStamp().slice(0, 6)}`;
  const productName = `Gorra Almacén ${wordStamp().slice(0, 6)}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    gestor = await context.newPage();
    const superToken = storedAuthToken(SUPERADMIN_STATE);
    company = await createDisposableCashCompany(gestor.request, superToken);
    expect((await apiJson(gestor.request, 'put', `/company-feature/${company.companyId}`, superToken, { features: { inventory: true } })).status).toBe(200);
    adminToken = (
      await apiJson<Envelope<{ Jwt: string }>>(gestor.request, 'post', '/signin', null, { email: company.adminEmail, password: company.password })
    ).body.data.Jwt;
    const api = <T,>(method: 'get' | 'post' | 'put', path: string, body?: object) => apiJson<Envelope<T>>(gestor.request, method, path, adminToken, body);

    const warehouse = await api<{ id: number }>('post', '/inventory/warehouses', {
      business_unit_id: company.storeId,
      code: 'PRIN',
      name: 'Almacén tienda',
      allow_negative_stock: false,
      track_lots: false,
      track_expiry: false,
      expiry_alert_days: 30,
      block_expired: true,
      is_default: true,
    });
    expect(warehouse.status).toBe(201);
    expect((await api('put', `/inventory/stores/${company.storeId}`, { inventory_enabled: true, inventory_exit_on: 'delivered' })).status).toBe(200);

    const client = await api<{ id: number }>('post', '/client/create', { company_id: company.companyId, name: clientName });
    const product = await api<{ id: number }>('post', '/product/create', { company_id: company.companyId, name: productName, price_unit: 15 });
    productId = product.body.data.id;
    const quotation = await api<{ id: number }>('post', '/quotation/create', {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [{ product_id: productId, quantity: 4, pricing_mode: 'unit' }],
    });
    const quotationId = quotation.body.data.id;
    expect((await api('put', `/quotation/status/${quotationId}`, { status: 'accepted' })).status).toBe(200);
    const detail = await api<{ items: { id: number }[] }>('get', `/quotation/find/${quotationId}`);
    const me = await api<{ id: number }>('get', '/user/user-account');
    const order = await api('post', '/purchase-order/create', {
      company_id: company.companyId,
      quotation_id: quotationId,
      assigned_to: me.body.data.id,
      items: [{ quotation_item_id: detail.body.data.items[0]?.id, quantity: 4 }],
    });
    expect(order.status).toBe(201);
    await loginViaUi(gestor, company.gestorEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('ofrece el almacén de la tienda y la compra entra al stock', async () => {
    await gestor.goto('/cotizaciones');
    await waitForToastsToClear(gestor);
    await gestor.getByRole('button', { name: 'Lista', exact: true }).click();
    await gestor.getByText(clientName, { exact: true }).first().click();
    const detailDialog = gestor.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await detailDialog.locator('[role="tab"]:has-text("Compras")').click();
    await detailDialog.locator('button[title="Registrar compra"]').first().click();
    await gestor.fill('#purchase-amount', '48');

    const field = detailDialog.getByTestId('purchase-warehouse');
    await expect(field.getByRole('combobox', { name: 'Ingresar al almacén' })).toContainText('Almacén tienda');
    await detailDialog.getByTestId('invoice-question').getByRole('button', { name: 'No lleva factura' }).click();
    await detailDialog.getByRole('button', { name: 'Guardar compra' }).click();
    await expect(gestor.getByText('Compra registrada e ingresada al almacén')).toBeVisible({ timeout: 10_000 });

    const stock = await apiJson<Envelope<{ data: StockRow[] }>>(
      gestor.request,
      'get',
      `/inventory/stock?searchTerm=${encodeURIComponent(productName)}`,
      adminToken,
    );
    expect(stock.body.data.data.find((row) => row.productId === productId)?.total).toBe(4);
  });
});
