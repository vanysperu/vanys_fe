import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import { apiJson, createDisposableCashCompany, loginViaUi, storedAuthToken, waitForToastsToClear, wordStamp, type DisposableCashCompany } from '../helpers';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// Pedido del usuario (14-nov): marcar un producto de la cotización como "no
// aceptado" por el cliente — sigue a la vista del equipo, deja de sumar al
// total, y se puede reactivar. Empresa DESECHABLE.
test.describe.configure({ mode: 'serial' });

test.describe('Cotización: productos no aceptados', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let gestor: Page;
  const stamp = wordStamp().slice(0, 6);
  const clientName = `Cliente NoAcepta ${stamp}`;
  const keptName = `Polo Acepta ${stamp}`;
  const droppedName = `Gorra Rechaza ${stamp}`;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    gestor = await context.newPage();
    company = await createDisposableCashCompany(gestor.request, storedAuthToken(SUPERADMIN_STATE));
    const adminToken = (
      await apiJson<Envelope<{ Jwt: string }>>(gestor.request, 'post', '/signin', null, { email: company.adminEmail, password: company.password })
    ).body.data.Jwt;
    const api = <T,>(method: 'get' | 'post' | 'put', path: string, body?: object) => apiJson<Envelope<T>>(gestor.request, method, path, adminToken, body);
    const client = await api<{ id: number }>('post', '/client/create', { company_id: company.companyId, name: clientName });
    const kept = await api<{ id: number }>('post', '/product/create', { company_id: company.companyId, name: keptName, price_unit: 20 });
    const dropped = await api<{ id: number }>('post', '/product/create', { company_id: company.companyId, name: droppedName, price_unit: 10 });
    const quotation = await api<{ id: number }>('post', '/quotation/create', {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [
        { product_id: kept.body.data.id, quantity: 10, pricing_mode: 'unit' },
        { product_id: dropped.body.data.id, quantity: 10, pricing_mode: 'unit' },
      ],
    });
    expect((await api('put', `/quotation/status/${quotation.body.data.id}`, { status: 'accepted' })).status).toBe(200);
    await loginViaUi(gestor, company.gestorEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('marca un producto como no aceptado y lo reactiva', async () => {
    await gestor.goto('/cotizaciones');
    await waitForToastsToClear(gestor);
    await gestor.getByRole('button', { name: 'Lista', exact: true }).click();
    await gestor.getByText(clientName, { exact: true }).first().click();
    const detail = gestor.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await expect(detail).toBeVisible();

    await detail.getByRole('button', { name: `Marcar ${droppedName} como no aceptado` }).click();
    await gestor.getByRole('dialog', { name: '¿El cliente no aceptó este producto?' }).getByRole('button', { name: 'Marcar como no aceptado' }).click();
    await expect(gestor.getByText('Producto marcado como no aceptado. Nuevo total: S/ 200.00')).toBeVisible({ timeout: 10_000 });

    const excluded = detail.getByTestId('excluded-items');
    await expect(excluded).toContainText(droppedName);
    // Con un solo producto aceptado no se puede desactivar el último: desde el
    // 21-nov el botón se ve deshabilitado con el motivo (antes desaparecía y
    // el usuario creía que la acción no existía).
    await expect(detail.getByRole('button', { name: `Marcar ${keptName} como no aceptado` })).toBeDisabled();
    await expect(detail.getByTestId('exclusion-unavailable')).toContainText('debe quedar al menos un producto aceptado');

    await excluded.getByRole('button', { name: 'Reactivar' }).click();
    await expect(gestor.getByText('Producto reactivado. Nuevo total: S/ 300.00')).toBeVisible({ timeout: 10_000 });
    await expect(detail.getByTestId('excluded-items')).toHaveCount(0);
  });
});
