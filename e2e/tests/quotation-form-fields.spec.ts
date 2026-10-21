import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSelectNear, stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// Pedido explícito del usuario: "que los campos tomen la info que deben".

// "S/ 9,109.18" -> 9109.18 (se compara el número, no el formato).
const amountOf = (text: string) => Number(text.replace(/[^\d.]/g, ''));

test('el Panel muestra el mismo "Total por cobrar" que la pantalla Por cobrar', async ({ page }) => {
  // El total se toma de la respuesta de la API: mientras carga, la pantalla
  // muestra "S/ 0.00" y leerla en ese momento daría un falso error.
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/receivable/list') && res.request().method() === 'GET'),
    page.goto('/por-cobrar'),
  ]);
  const expected = Number((await response.json()).data.summary.total_balance);
  await expect.poll(async () => amountOf(await page.getByTestId('receivables-total').innerText())).toBe(expected);

  await page.goto('/');
  // Antes se sumaban en el navegador las últimas 100 cotizaciones, incluidas
  // las pendientes; ahora sale del mismo criterio del backend.
  await expect.poll(async () => amountOf(await page.getByTestId('dashboard-receivable').innerText())).toBe(expected);
});

test('nueva cotización: tienda fija, modo de precio y precios de "Personalizado" se llenan solos', async ({ page }) => {
  const suffix = stamp();
  await page.goto('/cotizaciones');
  await page.click('button:has-text("Nueva cotización")');
  const dialog = page.locator('div[role="dialog"]');

  // El admin QA está atado a su tienda: se muestra fija (el backend la fuerza).
  await expect(dialog.getByTestId('quotation-fixed-store')).toHaveText('ACME-QA');

  // Sin producto, "Modo de precio" pide elegirlo en vez de quedar en blanco.
  const modeTrigger = dialog
    .locator('label', { hasText: /^Modo de precio$/ })
    .locator('xpath=..')
    .locator('button[role="combobox"]');
  await expect(modeTrigger).toHaveText('Elige un producto');
  await expect(modeTrigger).toBeDisabled();

  await page.click('button[title="Nuevo producto"]');
  await page.fill('#quick-product-name', `QA Producto Campos ${suffix}`);
  await page.fill('#quick-product-price-unit', '20');
  await page.click('#quick-product-requires-customization');
  await page.click('div[role="dialog"] button:has-text("Crear producto")');
  await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });
  await page.click('button[title="Nueva técnica"]');
  await page.fill('#quick-technique-name', `QA Técnica Campos ${wordStamp()}`);
  await page.fill('#quick-technique-price-unit', '5');
  await page.click('div[role="dialog"] button:has-text("Crear técnica")');
  await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

  await expect(modeTrigger).toHaveText('Por unidad');
  await chooseSelectNear(page, 'Modo de precio', 'Personalizado');
  // Arrancan con los precios del catálogo, listos para editar.
  const priceInput = (label: string) =>
    dialog.locator('div.space-y-1', { hasText: label }).locator('input');
  await expect(priceInput('Precio producto (S/)')).toHaveValue('20');
  await expect(priceInput('Precio técnica (S/)')).toHaveValue('5');
});
