import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import { apiJson, createDisposableCashCompany, loginViaUi, storedAuthToken, waitForToastsToClear, wordStamp, type DisposableCashCompany } from '../helpers';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// Día de hoy en Lima (YYYY-MM-DD): fecha de los pagos de prueba.
const limaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

// Pedido del usuario (19-nov): un pago mal registrado se corrige o se anula
// desde la misma cotización (antes solo desde /pagos), y un pago anulado se
// ve tachado y "Anulado" en vez de parecer vigente. Empresa DESECHABLE.
test.describe.configure({ mode: 'serial' });

test.describe('Cotización: corregir y anular pagos desde la pestaña Pagos', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let admin: Page;
  const stamp = wordStamp().slice(0, 6);
  const clientName = `Cliente PagosTab ${stamp}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    admin = await context.newPage();
    company = await createDisposableCashCompany(admin.request, storedAuthToken(SUPERADMIN_STATE));
    const adminToken = (
      await apiJson<Envelope<{ Jwt: string }>>(admin.request, 'post', '/signin', null, { email: company.adminEmail, password: company.password })
    ).body.data.Jwt;
    const api = <T,>(method: 'get' | 'post' | 'put', path: string, body?: object) => apiJson<Envelope<T>>(admin.request, method, path, adminToken, body);
    const client = await api<{ id: number }>('post', '/client/create', { company_id: company.companyId, name: clientName });
    const product = await api<{ id: number }>('post', '/product/create', { company_id: company.companyId, name: `Taza PagosTab ${stamp}`, price_unit: 20 });
    // Total S/ 200 (10 x 20).
    const quotation = await api<{ id: number }>('post', '/quotation/create', {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [{ product_id: product.body.data.id, quantity: 10, pricing_mode: 'unit' }],
    });
    const quotationId = quotation.body.data.id;
    expect((await api('put', `/quotation/status/${quotationId}`, { status: 'accepted' })).status).toBe(200);
    for (const amount of [100, 50]) {
      const payment = await api('post', `/quotation/${quotationId}/payments`, { amount, method: 'cash', paid_at: limaToday() });
      expect(payment.status).toBe(201);
    }
    // El admin (no el Gestor) es quien puede corregir y anular pagos.
    await loginViaUi(admin, company.adminEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('corrige un pago, anula otro y el anulado queda tachado sin sumar', async () => {
    await admin.goto('/cotizaciones');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Lista', exact: true }).click();
    await admin.getByText(clientName, { exact: true }).first().click();
    const detail = admin.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await expect(detail).toBeVisible();
    await detail.getByRole('tab', { name: 'Pagos' }).click();
    // Tarjetas "Pagado" y "Saldo pendiente" de la pestaña.
    const paidCard = detail.locator('div', { has: admin.getByText('Pagado', { exact: true }) }).last();
    const balanceCard = detail.locator('div', { has: admin.getByText('Saldo pendiente', { exact: true }) }).last();
    await expect(paidCard).toContainText('S/ 150.00');
    await expect(balanceCard).toContainText('S/ 50.00');

    const rows = detail.locator('[data-testid^="quotation-payment-"]');
    await expect(rows).toHaveCount(2);
    const first = rows.filter({ hasText: 'S/ 100.00' });
    const second = rows.filter({ hasText: 'S/ 50.00' });

    // Corregir 100 -> 80 con el mismo diálogo de /pagos (motivo + confirmación).
    await first.getByRole('button', { name: 'Corregir pago' }).click();
    await admin.fill('#correct-payment-amount', '80');
    await admin.fill('#correct-payment-reason', 'El cliente depositó 80, no 100');
    await admin.locator('div[role="dialog"]', { hasText: 'Corregir pago' }).getByRole('button', { name: 'Guardar corrección' }).click();
    await admin.getByRole('dialog', { name: '¿Confirmas la corrección?' }).getByRole('button', { name: 'Sí, corregir' }).click();
    await expect(admin.getByText('Pago corregido correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(rows.filter({ hasText: 'S/ 80.00' })).toContainText('Corregido');
    await expect(paidCard).toContainText('S/ 130.00');

    // Anular el de 50 (pide confirmación): sigue a la vista, tachado y sin sumar.
    await second.getByRole('button', { name: 'Deshabilitar pago' }).click();
    await admin.getByRole('dialog', { name: '¿Anular este pago?' }).getByRole('button', { name: 'Sí, anular' }).click();
    await expect(admin.getByText('Pago anulado')).toBeVisible({ timeout: 10_000 });
    await expect(second).toContainText('Anulado');
    await expect(paidCard).toContainText('S/ 80.00');
    await expect(balanceCard).toContainText('S/ 120.00');

    // Restaurar lo vuelve a sumar.
    await second.getByRole('button', { name: 'Habilitar pago' }).click();
    await admin.getByRole('dialog', { name: '¿Restaurar este pago?' }).getByRole('button', { name: 'Sí, restaurar' }).click();
    await expect(admin.getByText('Pago restaurado')).toBeVisible({ timeout: 10_000 });
    await expect(second).not.toContainText('Anulado');
    await expect(paidCard).toContainText('S/ 130.00');
  });
});
