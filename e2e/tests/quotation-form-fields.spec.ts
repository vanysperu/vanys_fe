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
  await page.fill('#quick-product-price_unit', '20');
  await page.click('#quick-product-requires_customization');
  await page.click('div[role="dialog"] button:has-text("Crear producto")');
  await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });
  await page.click('button[title="Nueva técnica"]');
  await page.fill('#quick-tech-name', `QA Técnica Campos ${wordStamp()}`);
  await page.fill('#quick-tech_price_unit', '5');
  await page.click('div[role="dialog"] button:has-text("Crear técnica")');
  await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

  await expect(modeTrigger).toHaveText('Por unidad');
  await chooseSelectNear(page, 'Modo de precio', 'Personalizado');
  // Arrancan con los precios del catálogo, listos para editar.
  const priceInput = (label: string) =>
    dialog.locator('div.space-y-1', { hasText: label }).locator('input');
  await expect(priceInput('Precio producto (S/)')).toHaveValue('20');
  await expect(priceInput('Precio técnica (S/)')).toHaveValue('5');

  // Ítem 8 del Sprint 2 (reporte del usuario con captura): un mensaje debajo
  // de un campo (acá el error de cantidad; igual con "Mínimo: 25") no
  // desacomoda la fila: las etiquetas siguen a la misma altura.
  await priceInput('Cantidad').fill('0');
  await dialog.getByRole('button', { name: 'Crear cotización' }).click();
  await expect(dialog.locator('div.space-y-1', { hasText: 'Cantidad' }).getByText('Mínimo 1')).toBeVisible();
  const topOf = async (pattern: RegExp) => (await dialog.locator('label', { hasText: pattern }).first().boundingBox())?.y ?? -1;
  const modeTop = await topOf(/^Modo de precio$/);
  expect(Math.abs((await topOf(/^Cantidad$/)) - modeTop)).toBeLessThanOrEqual(1);
  expect(Math.abs((await topOf(/^Precio producto \(S\/\)$/)) - modeTop)).toBeLessThanOrEqual(1);
});

// Sprint 2, ítem 9 (pedido del usuario): el "+" de cliente y de producto en
// Nueva cotización abre el MISMO formulario que los módulos Clientes y
// Productos, y crearlos ahí no envía la cotización.
test('nueva cotización: el "+" de cliente y producto abre el formulario de cada módulo', async ({ page }) => {
  const clientName = `QA Cliente Modulo ${wordStamp()}`;
  const productName = `QA Producto Modulo ${stamp()}`;
  await page.goto('/cotizaciones');
  await page.click('button:has-text("Nueva cotización")');
  const quotationDialog = page.getByRole('dialog', { name: 'Nueva cotización' });

  await page.click('button[title="Nuevo cliente"]');
  const clientDialog = page.getByRole('dialog', { name: 'Nuevo cliente' });
  // Campos que el diálogo rápido de antes no tenía.
  await expect(clientDialog.getByText('Tipo de documento (opcional)')).toBeVisible();
  await expect(clientDialog.getByLabel('Dirección')).toBeVisible();
  await clientDialog.locator('#quick-client-name').fill(clientName);
  await clientDialog.locator('#quick-client-address').fill('Av. Siempre Viva 742');
  await clientDialog.getByRole('button', { name: 'Crear cliente' }).click();
  await expect(page.getByText('Cliente creado correctamente')).toBeVisible({ timeout: 10_000 });
  await expect(clientDialog).toBeHidden();
  await expect(quotationDialog.getByText(clientName)).toBeVisible();

  await page.click('button[title="Nuevo producto"]');
  const productDialog = page.getByRole('dialog', { name: 'Nuevo producto' });
  await expect(productDialog.getByLabel('SKU')).toBeVisible();
  await expect(productDialog.getByText('Pedido mínimo (opcional)')).toBeVisible();
  await expect(productDialog.getByText('Colores')).toBeVisible();
  await productDialog.locator('#quick-product-name').fill(productName);
  await productDialog.locator('#quick-product-sku').fill(`SKU-${stamp()}`);
  await productDialog.locator('#quick-product-price_unit').fill('12');
  await productDialog.getByRole('button', { name: 'Crear producto' }).click();
  await expect(page.getByText('Producto creado correctamente')).toBeVisible({ timeout: 10_000 });
  await expect(productDialog).toBeHidden();
  await expect(quotationDialog.getByText(productName)).toBeVisible();

  // La cotización sigue abierta y sin enviar: crear el producto no la mandó.
  await expect(quotationDialog.getByRole('button', { name: 'Crear cotización' })).toBeVisible();
  await expect(page.getByText(/Cotización creada/)).toHaveCount(0);
});
