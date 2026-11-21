import { expect, test, type Page } from '@playwright/test';

import { SUPERADMIN } from '../auth';
import {
  apiJson,
  businessTodayDay,
  createDisposableCashCompany,
  loginViaUi,
  pageAuthToken,
  pickDate,
  wordStamp,
  type DisposableCashCompany,
} from '../helpers';

// Pedidos del usuario del 21-nov-2026: precios que se pueden borrar, rueda del
// mouse en inputs numéricos, préstamos con cobros en Caja, descuento por
// producto, cambio de estado del admin, diseños (mockups), enlace que abre el
// PDF, Excel y el detalle del IGV en Caja.
//
// Empresa DESECHABLE con su admin y gestor (nunca admin.qa ni login.qa: el
// usuario trabaja con esas cuentas y cada login cierra su sesión). Corre sin
// global.setup: `npx playwright test pedidos-21-nov --no-deps`.

interface Envelope<T> {
  success: boolean;
  data: T;
}

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

let company: DisposableCashCompany;
let superToken: string;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  const login = await apiJson<Envelope<{ Jwt: string }>>(request, 'post', '/signin', null, SUPERADMIN);
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  superToken = login.body.data.Jwt;
  company = await createDisposableCashCompany(request, superToken);
});

test.afterAll(async ({ request }) => {
  if (company?.companyId) await apiJson(request, 'put', `/company/disable/${company.companyId}`, superToken);
});

const loginAdmin = async (page: Page) => {
  await loginViaUi(page, company.adminEmail, company.password);
  return pageAuthToken(page);
};

test('préstamo: la rueda no cambia el monto, se cobra y aparece en Caja', async ({ page }) => {
  await loginAdmin(page);
  const borrower = `Rosa Quispe ${wordStamp().slice(0, 5)}`;
  await page.goto('/prestamos');
  await page.getByRole('button', { name: 'Nuevo préstamo' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo préstamo' });
  await dialog.locator('#loan-borrower').fill(borrower);
  const principal = dialog.locator('#loan-principal');
  await principal.fill('1000');
  // Scroll con el mouse/touchpad encima del input con foco: el valor no cambia.
  await principal.focus();
  await principal.hover();
  for (let step = 0; step < 5; step += 1) await page.mouse.wheel(0, 120);
  await expect(principal).toHaveValue('1000');
  await dialog.locator('#loan-rate').fill('10');
  await expect(dialog.getByTestId('loan-interest-preview')).toContainText('1,100.00');
  await pickDate(page, 'loan-date', businessTodayDay());
  await dialog.getByRole('button', { name: 'Registrar préstamo' }).click();
  await expect(page.getByText('Préstamo registrado')).toBeVisible({ timeout: 10_000 });

  const row = page.locator('tr', { hasText: borrower });
  await expect(row).toContainText('Por cobrar');
  await row.getByRole('button', { name: `Ver el préstamo a ${borrower}` }).click();
  const detail = page.getByRole('dialog', { name: new RegExp(`Préstamo a ${borrower}`) });
  await expect(detail.locator('#loan-payment-amount')).toHaveValue('1100');
  await pickDate(page, 'loan-payment-date', businessTodayDay());
  await detail.getByRole('button', { name: 'Registrar cobro' }).click();
  await expect(page.getByText('Cobro registrado: el préstamo quedó pagado')).toBeVisible({ timeout: 10_000 });
  await expect(detail.getByTestId('loan-payments')).toContainText('100.00');
  await page.keyboard.press('Escape');
  await expect(row).toContainText('Pagado');

  await page.goto('/caja');
  await expect(page.getByText(`Préstamo a ${borrower}`)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(`Interés de préstamo — ${borrower}`)).toBeVisible();
  await expect(page.getByText('Préstamo (sale)').first()).toBeVisible();
});

test('producto: borrar el precio por unidad lo deja vacío (no el precio viejo)', async ({ page, request }) => {
  const token = await loginAdmin(page);
  const name = `QA Precio vacio ${wordStamp().slice(0, 6)}`;
  const created = await apiJson<Envelope<{ id: number }>>(request, 'post', '/product/create', token, {
    company_id: company.companyId,
    name,
    price_unit: 25,
    price_hundred: 2000,
  });
  expect(created.status, JSON.stringify(created.body)).toBeLessThan(300);

  await page.goto('/productos');
  const row = page.locator('tr', { hasText: name });
  await expect(row).toContainText('Unidad: S/ 25.00');
  await row.getByRole('button', { name: 'Editar producto' }).click();
  await expect(page.locator('div[role="dialog"]', { hasText: 'Editar producto' })).toBeVisible();
  await page.fill('#price_unit', '');
  await page.click('div[role="dialog"] button:has-text("Guardar cambios")');
  await expect(page.getByText('Producto actualizado correctamente')).toBeVisible({ timeout: 10_000 });
  await expect(row).not.toContainText('Unidad:');

  const list = await apiJson<Envelope<{ data: { id: number; price_unit: string | null }[] }>>(
    request,
    'get',
    `/product/list?page=1&limit=10&name=${encodeURIComponent(name)}`,
    token,
  );
  expect(list.body.data.data.find((row) => row.id === created.body.data.id)?.price_unit).toBeNull();
});

test('cotización: descuento, cambio de estado del admin, diseños, enlace al PDF y Excel', async ({ page, request, browser }) => {
  const token = await loginAdmin(page);
  const suffix = wordStamp().slice(0, 6);
  const client = await apiJson<Envelope<{ id: number }>>(request, 'post', '/client/create', token, {
    company_id: company.companyId,
    name: `Cliente Pedidos ${suffix}`,
  });
  const product = await apiJson<Envelope<{ id: number }>>(request, 'post', '/product/create', token, {
    company_id: company.companyId,
    name: `Polo Pedidos ${suffix}`,
    price_unit: 25,
  });
  const quotation = await apiJson<Envelope<{ id: number }>>(request, 'post', '/quotation/create', token, {
    company_id: company.companyId,
    business_unit_id: company.storeId,
    client_id: client.body.data.id,
    items: [{ product_id: product.body.data.id, quantity: 10, pricing_mode: 'unit', discount_type: 'percent', discount_value: 20 }],
  });
  expect(quotation.status, JSON.stringify(quotation.body)).toBe(201);
  const quotationId = quotation.body.data.id;

  await page.goto(`/cotizaciones?abrir=${quotationId}`);
  const detail = page.getByRole('dialog').filter({ hasText: `Cliente Pedidos ${suffix}` }).first();
  await expect(detail).toBeVisible({ timeout: 10_000 });
  // Descuento: precio de antes tachado y el porcentaje.
  await expect(detail.getByText('−20%').first()).toBeVisible();
  await expect(detail.getByText('S/ 20.00').first()).toBeVisible();

  // El admin cambia el estado a cualquiera (salta pasos).
  await detail.getByRole('combobox', { name: 'Cambiar estado' }).click();
  await page.getByRole('option', { name: 'En proceso' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Cambiar el estado de la cotización?' });
  await confirm.locator('#force-status-note').fill('Aprobado por WhatsApp');
  await confirm.getByRole('button', { name: 'Cambiar estado' }).click();
  await expect(page.getByText('Estado cambiado a "En proceso"')).toBeVisible({ timeout: 10_000 });

  // Diseños (mockups): se sube una imagen y queda a la vista.
  await detail.getByRole('tab', { name: 'Diseños' }).click();
  await detail.getByTestId('mockup-file-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 });
  await expect(page.getByText('Diseño subido')).toBeVisible({ timeout: 15_000 });
  await expect(detail.getByRole('button', { name: /Ver diseño/ })).toBeVisible();

  // El enlace del cliente abre el PDF mismo.
  const link = await apiJson<Envelope<{ url: string }>>(request, 'get', `/quotation/${quotationId}/public-link`, token);
  const visitor = await browser.newContext({ acceptDownloads: true });
  const publicPage = await visitor.newPage();
  const pdfResponse = publicPage.waitForResponse((response) => /\/public\/q\/[A-Za-z0-9_-]{22}\/pdf$/.test(response.url()));
  await publicPage.goto(new URL(link.body.data.url).pathname);
  const pdf = await pdfResponse;
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toContain('application/pdf');
  await visitor.close();

  // Excel de cotizaciones con los filtros de la pantalla.
  await page.keyboard.press('Escape');
  await page.goto('/cotizaciones');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar Excel' }).click();
  expect((await download).suggestedFilename()).toMatch(/^cotizaciones-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('el gestor no ve "Cambiar estado"', async ({ page, request }) => {
  const adminLogin = await apiJson<Envelope<{ Jwt: string }>>(request, 'post', '/signin', null, {
    email: company.gestorEmail,
    password: company.password,
  });
  expect(adminLogin.status).toBe(200);
  await loginViaUi(page, company.gestorEmail, company.password);
  const token = await pageAuthToken(page);
  const list = await apiJson<Envelope<{ data: { id: number }[] }>>(request, 'get', '/quotation/list?page=1&limit=1', token);
  const quotationId = list.body.data.data[0]?.id;
  expect(quotationId).toBeDefined();
  await page.goto(`/cotizaciones?abrir=${quotationId}`);
  await expect(page.getByRole('tab', { name: 'Diseños' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('combobox', { name: 'Cambiar estado' })).toHaveCount(0);
});

test('Caja: "Ver cómo se calculó" el IGV del mes', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/caja');
  await page.getByRole('button', { name: 'Ver cómo se calculó' }).click();
  const dialog = page.getByRole('dialog', { name: /¿Cómo se calculó el IGV/ });
  await expect(dialog.getByTestId('igv-equation')).toBeVisible({ timeout: 10_000 });
  await expect(dialog.getByText('1. Cobros del mes: el IGV que cobraste')).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exportar Excel' }).click();
  expect((await download).suggestedFilename()).toMatch(/^igv-\d{4}-\d{2}\.xlsx$/);
});
