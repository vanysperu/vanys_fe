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

// Sprint 2, ítem 3: el Gestor registra compras con "Sí, llega después" y, al
// llegar la factura, la registra UNA vez para todas desde Facturas → "Compras
// sin factura", sin motivo y sin pasar por "Corregir compra". Empresa DESECHABLE.
test.describe.configure({ mode: 'serial' });

test.describe('Compras sin factura', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let gestor: Page;
  let adminToken: string;
  const clientName = `Cliente Factura ${wordStamp().slice(0, 6)}`;
  const series = `F${String(Date.now()).slice(-3)}-${String(Date.now()).slice(-5)}`;
  const itemIds: number[] = [];

  // Cotización aceptada de la tienda del gestor + su orden de compra.
  const createOrder = async (page: Page, productName: string, clientLabel: string) => {
    const client = await apiJson<Envelope<{ id: number }>>(page.request, 'post', '/client/create', adminToken, {
      company_id: company.companyId,
      name: clientLabel,
    });
    const product = await apiJson<Envelope<{ id: number }>>(page.request, 'post', '/product/create', adminToken, {
      company_id: company.companyId,
      name: productName,
      price_unit: 12,
    });
    const quotation = await apiJson<Envelope<{ id: number }>>(page.request, 'post', '/quotation/create', adminToken, {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [{ product_id: product.body.data.id, quantity: 5, pricing_mode: 'unit' }],
    });
    const quotationId = quotation.body.data.id;
    expect((await apiJson(page.request, 'put', `/quotation/status/${quotationId}`, adminToken, { status: 'accepted' })).status).toBe(200);
    const detail = await apiJson<Envelope<{ items: { id: number }[] }>>(page.request, 'get', `/quotation/find/${quotationId}`, adminToken);
    const me = await apiJson<Envelope<{ id: number }>>(page.request, 'get', '/user/user-account', adminToken);
    const order = await apiJson<Envelope<{ id: number }>>(page.request, 'post', '/purchase-order/create', adminToken, {
      company_id: company.companyId,
      quotation_id: quotationId,
      assigned_to: me.body.data.id,
      items: [{ quotation_item_id: detail.body.data.items[0]?.id, quantity: 5 }],
    });
    expect(order.status).toBe(201);
    const orderDetail = await apiJson<Envelope<{ items: { id: number }[] }>>(page.request, 'get', `/purchase-order/find/${order.body.data.id}`, adminToken);
    return orderDetail.body.data.items[0]?.id as number;
  };

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    gestor = await context.newPage();
    company = await createDisposableCashCompany(gestor.request, storedAuthToken(SUPERADMIN_STATE));
    const session = await apiJson<Envelope<{ Jwt: string }>>(gestor.request, 'post', '/signin', null, {
      email: company.adminEmail,
      password: company.password,
    });
    adminToken = session.body.data.Jwt;
    itemIds.push(await createOrder(gestor, `Taza Factura ${wordStamp().slice(0, 5)}`, clientName));
    itemIds.push(await createOrder(gestor, `Polo Factura ${wordStamp().slice(0, 5)}`, `Otro ${clientName}`));
    await loginViaUi(gestor, company.gestorEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. el Gestor registra una compra con "Sí, llega después"', async () => {
    await gestor.goto('/cotizaciones');
    await waitForToastsToClear(gestor);
    await gestor.getByRole('button', { name: 'Lista', exact: true }).click();
    await gestor.getByText(clientName, { exact: true }).first().click();
    const detailDialog = gestor.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await expect(detailDialog).toBeVisible();
    await detailDialog.locator('[role="tab"]:has-text("Compras")').click();
    await detailDialog.locator('button[title="Registrar compra"]').first().click();
    await gestor.fill('#purchase-amount', '40');
    const question = detailDialog.getByTestId('invoice-question');
    await question.getByRole('button', { name: 'Sí, llega después' }).click();
    await expect(question).toContainText('Compras sin factura');
    await detailDialog.getByRole('button', { name: 'Guardar compra' }).click();
    await expect(gestor.getByText(/Quedó en Facturas → "Compras sin factura"/)).toBeVisible({ timeout: 10_000 });
    await detailDialog.getByRole('button', { name: /Ver compras \(1\)/ }).click();
    await expect(detailDialog.getByTestId('purchase-lines').getByText('Factura pendiente')).toBeVisible();
    await expect(detailDialog.getByTestId('purchase-lines').getByRole('button', { name: 'Vincular factura' })).toBeVisible();
  });

  test('2. en la bandeja elige las dos compras y registra UNA factura', async () => {
    // La otra compra, por la API (mismo efecto que el paso 1).
    const second = await apiJson(gestor.request, 'post', `/purchase-order/item/${itemIds[1]}/purchases`, adminToken, {
      quantity: 5,
      amount: 60,
      funding_source: 'company',
      invoice_pending: true,
    });
    expect(second.status, JSON.stringify(second.body)).toBe(201);

    await gestor.goto('/facturas');
    await waitForToastsToClear(gestor);
    const tab = gestor.getByTestId('pending-purchases-tab');
    await expect(tab).toContainText('2');
    await tab.click();
    const inbox = gestor.getByTestId('pending-purchases');
    await expect(inbox.getByRole('checkbox')).toHaveCount(2);
    await inbox.getByRole('button', { name: 'Seleccionar la página' }).click();
    await expect(inbox).toContainText('2 seleccionadas');
    await inbox.getByRole('button', { name: 'Registrar factura' }).click();

    const dialog = gestor.getByTestId('link-invoice-dialog');
    await expect(dialog).toContainText('2 compras');
    await dialog.locator('#invoice-series').fill(series);
    await dialog.locator('#invoice-total').fill('100');
    await dialog.getByRole('button', { name: 'Guardar factura' }).click();
    await expect(gestor.getByText('Factura vinculada a 2 compras')).toBeVisible({ timeout: 10_000 });
    await expect(inbox.getByText('No hay compras sin factura')).toBeVisible();
    await expect(tab).not.toContainText('2');
  });

  test('3. la factura se encuentra por su número y muestra sus dos compras', async () => {
    await gestor.getByRole('tab', { name: 'Facturas' }).click();
    await gestor.getByPlaceholder('Buscar número, proveedor, cotización o producto...').fill(series);
    const row = gestor.locator('tr', { hasText: series });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByTitle('Compras y datos de la factura').click();
    const dialog = gestor.getByTestId('invoice-purchases-dialog');
    await expect(dialog.getByRole('button', { name: /^Quitar / })).toHaveCount(2);
    await expect(dialog.locator('#invoice-edit-series')).toHaveValue(series);
  });
});
