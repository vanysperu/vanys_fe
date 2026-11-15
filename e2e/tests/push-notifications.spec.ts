import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import { apiJson, createDisposableCashCompany, loginViaUi, storedAuthToken, waitForToastsToClear, wordStamp, type DisposableCashCompany } from '../helpers';

interface Envelope<T> {
  success: boolean;
  data: T;
}

// Notificaciones al teléfono (pedido del usuario, 14-nov-2026). El aviso real
// solo se puede probar con la app instalada en un teléfono (en desarrollo no
// hay service worker): acá se prueba lo que ve la persona — la opción en el
// menú de perfil, el enlace que abre el aviso y que "Salir" sigue funcionando.
test.describe.configure({ mode: 'serial' });

test.describe('Notificaciones al teléfono', () => {
  let company: DisposableCashCompany;
  let context: BrowserContext;
  let gestor: Page;
  let quotationId: number;
  const clientName = `Cliente Aviso ${wordStamp().slice(0, 6)}`;

  test.beforeAll(async ({ browser }) => {
    // Permiso de notificaciones ya concedido: así "Activar" no se queda en el
    // diálogo del navegador (que Playwright no puede tocar).
    context = await browser.newContext({ permissions: ['notifications'] });
    gestor = await context.newPage();
    company = await createDisposableCashCompany(gestor.request, storedAuthToken(SUPERADMIN_STATE));
    const adminToken = (
      await apiJson<Envelope<{ Jwt: string }>>(gestor.request, 'post', '/signin', null, { email: company.adminEmail, password: company.password })
    ).body.data.Jwt;
    const api = <T,>(path: string, body: object) => apiJson<Envelope<T>>(gestor.request, 'post', path, adminToken, body);
    const client = await api<{ id: number }>('/client/create', { company_id: company.companyId, name: clientName });
    const product = await api<{ id: number }>('/product/create', { company_id: company.companyId, name: `Polo Aviso ${wordStamp().slice(0, 6)}`, price_unit: 15 });
    const quotation = await api<{ id: number }>('/quotation/create', {
      company_id: company.companyId,
      business_unit_id: company.storeId,
      client_id: client.body.data.id,
      items: [{ product_id: product.body.data.id, quantity: 5, pricing_mode: 'unit' }],
    });
    quotationId = quotation.body.data.id;
    await loginViaUi(gestor, company.gestorEmail, company.password);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('el enlace del aviso abre esa cotización y limpia la URL', async () => {
    await gestor.goto(`/cotizaciones?abrir=${quotationId}`);
    const detail = gestor.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText(clientName);
    await expect(gestor).toHaveURL(/\/cotizaciones$/);
  });

  test('la opción "Notificaciones" del perfil explica y ofrece activarlas', async () => {
    await gestor.goto('/cotizaciones');
    await waitForToastsToClear(gestor);
    await gestor.getByRole('button', { name: 'Abrir menú de perfil' }).click();
    await gestor.getByRole('button', { name: 'Notificaciones', exact: true }).click();

    const dialog = gestor.getByRole('dialog', { name: 'Notificaciones en este teléfono' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('pedido nuevo para cotizar');
    const activate = dialog.getByRole('button', { name: 'Activar notificaciones' });
    await expect(activate).toBeVisible();

    // Sin service worker (desarrollo) no se queda colgado: avisa qué hacer.
    await activate.click();
    await expect(gestor.getByText('La app todavía no terminó de cargar', { exact: false })).toBeVisible();
    await gestor.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('"Salir" sigue cerrando la sesión', async () => {
    await gestor.getByRole('button', { name: 'Abrir menú de perfil' }).click();
    await gestor.getByRole('button', { name: 'Salir', exact: true }).click();
    await expect(gestor).toHaveURL(/\/login$/);
  });
});
