import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { apiJson, storedAuthToken, waitForToastsToClear, wordStamp } from '../helpers';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

test.use({ storageState: ADMIN_STATE });

// Compartir la cotización (Sprint 2, ítem 7, pedido explícito del usuario):
// vista sin iniciar sesión, interruptor "Visible para el cliente", WhatsApp y
// correo con enlace + PDF.
test('compartir: el cliente la ve sin sesión, por WhatsApp y por correo; apagada ya no se ve', async ({ page, request, browser }) => {
  const token = storedAuthToken(ADMIN_STATE);
  const access = await apiJson<ApiEnvelope<{ companyId: number }>>(request, 'get', '/access/me', token);
  const companyId = access.body.data.companyId;
  const stamp = wordStamp();
  const clientName = `Cliente Compartir ${stamp}`;
  const productName = `Producto Compartir ${stamp}`;

  const client = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/client/create', token, {
    company_id: companyId,
    name: clientName,
    email: `cliente.${stamp}@acme.test`,
    phone: '987654321',
  });
  expect(client.status, JSON.stringify(client.body)).toBeLessThan(300);
  const product = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/product/create', token, {
    company_id: companyId,
    name: productName,
    price_unit: 12.5,
  });
  const quotation = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/quotation/create', token, {
    company_id: companyId,
    client_id: client.body.data.id,
    items: [{ product_id: product.body.data.id, quantity: 100, pricing_mode: 'unit' }],
  });
  expect(quotation.status, JSON.stringify(quotation.body)).toBeLessThan(300);
  const quotationId = quotation.body.data.id;
  const code = `COT-${String(quotationId).padStart(4, '0')}`;

  // Desde el detalle: botón "Compartir con el cliente".
  await page.goto('/cotizaciones');
  await waitForToastsToClear(page);
  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.click(`span:has-text("${clientName}")`);
  await page.getByRole('button', { name: 'Compartir con el cliente' }).click();

  const share = page.getByRole('dialog', { name: `Compartir ${code}` });
  await expect(share).toBeVisible();
  await expect(share.getByRole('switch', { name: 'Visible para el cliente' })).toHaveAttribute('aria-checked', 'true');
  const url = await share.getByRole('textbox', { name: 'Enlace de la cotización' }).inputValue();
  expect(url).toMatch(/\/c\/[A-Za-z0-9_-]{22}$/);

  // WhatsApp: número del cliente (con 51) y el enlace en el mensaje.
  const whatsapp = share.getByRole('link', { name: 'Abrir WhatsApp' });
  await expect(whatsapp).toHaveAttribute('href', /^https:\/\/wa\.me\/51987654321\?text=/);
  expect(decodeURIComponent((await whatsapp.getAttribute('href')) ?? '')).toContain(url);

  // Correo: precargado con el correo del cliente; sale por la cola.
  await share.getByRole('tab', { name: 'Correo' }).click();
  await expect(share.locator('#share-email-to')).toHaveValue(`cliente.${stamp}@acme.test`);
  await share.getByRole('button', { name: 'Enviar correo' }).click();
  await expect(page.getByText(`Cotización enviada a cliente.${stamp}@acme.test`)).toBeVisible({ timeout: 10_000 });

  // El cliente, sin sesión, la ve con el producto y el botón del PDF.
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  const publicPath = new URL(url).pathname;
  await publicPage.goto(publicPath);
  await expect(publicPage.getByRole('heading', { name: `Cotización ${code}` })).toBeVisible({ timeout: 10_000 });
  await expect(publicPage.locator('table').getByText(productName)).toBeVisible();
  await expect(publicPage.getByRole('link', { name: 'Descargar PDF' })).toHaveAttribute('href', /\/public\/q\/[A-Za-z0-9_-]{22}\/pdf$/);
  // Sin el aviso "Instala Vanys" (es para el equipo).
  await expect(publicPage.getByText(/Instala Vanys/)).toHaveCount(0);

  // Apagada, el mismo enlace dice que ya no está disponible.
  const off = await apiJson<ApiEnvelope<{ enabled: boolean }>>(request, 'put', `/quotation/${quotationId}/public-link`, token, {
    enabled: false,
  });
  expect(off.body.data.enabled).toBe(false);
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { name: 'Esta cotización ya no está disponible' })).toBeVisible({ timeout: 10_000 });
  await visitor.close();
});
