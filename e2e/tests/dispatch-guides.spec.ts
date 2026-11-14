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

// Sprint 2, ítem 1 — guía de remisión en MODO MANUAL: el Gestor arma la guía
// desde una cotización Lista, la guarda como borrador y la registra con el
// número que le dio SUNAT. Nada se envía a SUNAT. Empresa DESECHABLE.
test.describe.configure({ mode: 'serial' });

test.describe('Guías de remisión', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let gestor: Page;
  const clientName = `Cliente Guía ${wordStamp().slice(0, 6)}`;
  const series = `T${String(Date.now()).slice(-3)}`;
  const guideNumber = Number(String(Date.now()).slice(-5));

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    gestor = await context.newPage();
    const superToken = storedAuthToken(SUPERADMIN_STATE);
    company = await createDisposableCashCompany(gestor.request, superToken);
    expect((await apiJson(gestor.request, 'put', `/company-feature/${company.companyId}`, superToken, { features: { dispatch_guide: true } })).status).toBe(200);
    const adminToken = (
      await apiJson<Envelope<{ Jwt: string }>>(gestor.request, 'post', '/signin', null, { email: company.adminEmail, password: company.password })
    ).body.data.Jwt;
    const api = <T,>(method: 'get' | 'post' | 'put', path: string, body?: object) => apiJson<Envelope<T>>(gestor.request, method, path, adminToken, body);

    expect((await api('post', '/dispatch-guide/vehicles', { plate: 'BXK-482', description: 'Furgoneta' })).status).toBe(201);
    expect(
      (await api('post', '/dispatch-guide/drivers', { doc_type: '1', doc_number: '41234567', first_names: 'Rosa', last_names: 'Huamán', license_number: 'Q41234567' })).status,
    ).toBe(201);

    const client = await api<{ id: number }>('post', '/client/create', {
      company_id: company.companyId,
      name: clientName,
      document_number: '20512345678',
      address: 'Av. Arequipa 1200, Lince',
    });
    const product = await api<{ id: number }>('post', '/product/create', { company_id: company.companyId, name: `Taza Guía ${wordStamp().slice(0, 5)}`, price_unit: 12 });
    const quotation = await api<{ id: number }>('post', '/quotation/create', {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [{ product_id: product.body.data.id, quantity: 8, pricing_mode: 'unit' }],
    });
    for (const status of ['accepted', 'design_pending', 'in_process', 'ready']) {
      expect((await api('put', `/quotation/status/${quotation.body.data.id}`, { status })).status).toBe(200);
    }
    await loginViaUi(gestor, company.gestorEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1. desde la cotización Lista arma el borrador con lo que falta despachar', async () => {
    await gestor.goto('/cotizaciones');
    await waitForToastsToClear(gestor);
    await gestor.getByRole('button', { name: 'Lista', exact: true }).click();
    await gestor.getByText(clientName, { exact: true }).first().click();
    const detail = gestor.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await detail.getByRole('button', { name: 'Armar guía de remisión' }).click();

    const form = gestor.getByTestId('guide-form-dialog');
    await expect(form.getByRole('textbox', { name: 'Descripción del bien 1' })).toHaveValue(/Taza Guía/);
    await expect(form.getByText('Falta despachar: 8')).toBeVisible();
    await expect(form.locator('#guide-recipient-doc')).toHaveValue('20512345678');
    await expect(form.locator('#guide-destination-address')).toHaveValue('Av. Arequipa 1200, Lince');

    await form.locator('#guide-origin-address').fill('Jr. Gamarra 600, La Victoria');
    await form.getByRole('textbox', { name: 'Ubigeo de partida' }).fill('150115');
    await form.getByRole('textbox', { name: 'Ubigeo de llegada' }).fill('150116');
    await form.locator('#guide-weight').fill('6.5');
    await form.locator('#guide-vehicle').click();
    await gestor.locator('[cmdk-item]', { hasText: 'BXK482' }).first().click();
    await form.locator('#guide-driver').click();
    await gestor.locator('[cmdk-item]', { hasText: 'Rosa Huamán' }).first().click();
    await form.getByRole('button', { name: 'Guardar borrador' }).click();
    await expect(gestor.getByText(/Borrador de guía #\d+ listo/)).toBeVisible({ timeout: 10_000 });
  });

  test('2. en Logística → Guías registra el número que dio SUNAT', async () => {
    await gestor.keyboard.press('Escape');
    // El Gestor solo ve Guías (vehículos y conductores son del admin): un grupo con
    // un solo enlace se muestra como enlace suelto, sin el grupo Logística.
    await gestor.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Guías de remisión' }).click();
    await expect(gestor).toHaveURL('/logistica/guias');
    const row = gestor.locator('tr', { hasText: clientName });
    await expect(row).toContainText('Borrador');
    await row.getByTitle('Registrar guía emitida').click();

    const dialog = gestor.getByTestId('register-guide-dialog');
    await dialog.locator('#guide-series').fill(series);
    await dialog.locator('#guide-number').fill(String(guideNumber));
    await dialog.getByRole('button', { name: 'Registrar' }).click();
    await expect(gestor.getByText(`Guía ${series}-${guideNumber} registrada`)).toBeVisible({ timeout: 10_000 });
    await expect(gestor.locator('tr', { hasText: `${series}-${guideNumber}` })).toContainText('Registrada');
  });
});
