import { expect, type Page, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSearchableSelect, chooseSelectNear, stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// Cliente + producto + técnica creados desde el propio formulario de
// cotización (diálogos rápidos), con los precios por escala indicados.
async function startQuotation(
  page: Page,
  prices: { productUnit: string; productHundred?: string; techniqueUnit: string; techniqueHundred?: string },
) {
  const suffix = stamp();
  const clientName = `QA Cliente Cambios ${wordStamp()}`;
  const productName = `QA Producto Cambios ${suffix}`;

  await page.goto('/cotizaciones');
  await page.click('button:has-text("Nueva cotización")');
  await page.click('button[title="Nuevo cliente"]');
  await page.fill('#quick-client-name', clientName);
  await page.click('div[role="dialog"] button:has-text("Crear cliente")');
  await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

  await page.click('button[title="Nuevo producto"]');
  await page.fill('#quick-product-name', productName);
  await page.fill('#quick-product-price-unit', prices.productUnit);
  if (prices.productHundred) await page.fill('#quick-product-price-hundred', prices.productHundred);
  // Estos productos se cotizan con técnica: hay que marcarlos.
  await page.click('#quick-product-requires-customization');
  await page.click('div[role="dialog"] button:has-text("Crear producto")');
  await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

  await page.click('button[title="Nueva técnica"]');
  await page.fill('#quick-technique-name', `QA Técnica Cambios ${suffix}`);
  await page.fill('#quick-technique-price-unit', prices.techniqueUnit);
  if (prices.techniqueHundred) await page.fill('#quick-technique-price-hundred', prices.techniqueHundred);
  await page.click('div[role="dialog"] button:has-text("Crear técnica")');
  await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

  return { clientName, productName };
}

test.describe('Cambios pedidos: precios, compras, clientes y menú', () => {
  test('la técnica se cotiza por escala igual que el producto: (0.90 + 0.95) × 10 = 18.50', async ({ page }) => {
    await startQuotation(page, { productUnit: '1.20', productHundred: '0.90', techniqueUnit: '1.50', techniqueHundred: '0.95' });

    await chooseSelectNear(page, 'Modo de precio', 'Por ciento');
    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');

    const breakdown = page.getByTestId('item-price-breakdown-0');
    await expect(breakdown).toHaveText('Producto S/ 0.90 + técnica S/ 0.95 = S/ 1.85 c/u × 10 = S/ 18.50');

    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });
  });

  test('comprar más de lo pedido pide confirmación en un modal (No cancela, Sí registra)', async ({ page }) => {
    const { clientName, productName } = await startQuotation(page, { productUnit: '20', techniqueUnit: '5' });
    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.click(`span:has-text("${clientName}")`);
    await page.click('div[role="dialog"] [role="tab"]:has-text("Compras")');
    await page.click('div[role="dialog"] button:has-text("Crear orden de compra")');
    await page.locator('div[role="dialog"] label', { hasText: productName }).click();
    await chooseSearchableSelect(page, 'Asignado a', 'Ana Acme');
    await page.click('div[role="dialog"] button:has-text("Crear orden")');
    await expect(page.locator('text=Orden de compra creada')).toBeVisible({ timeout: 10_000 });

    await page.click('div[role="dialog"] [role="tab"]:has-text("Compras")');
    await page.click('div[role="dialog"] button[title="Registrar compra"]');
    await page.fill('#purchase-quantity', '15');
    await page.fill('#purchase-amount', '60');
    await page.click('div[role="dialog"] button:has-text("Guardar compra")');

    const confirm = page.locator('[role="dialog"], [role="alertdialog"]', { hasText: '¿Comprar más de lo pedido?' });
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await expect(confirm).toContainText('La cantidad a comprar era 10');
    await expect(confirm).toContainText('5 más de lo pedido');

    // "No": no se registra nada y el formulario sigue abierto.
    await confirm.getByRole('button', { name: 'No' }).click();
    await expect(confirm).toBeHidden();
    await expect(page.locator('text=Compra registrada')).toHaveCount(0);

    // "Sí": se registra la compra adicional.
    await page.click('div[role="dialog"] button:has-text("Guardar compra")');
    await expect(confirm).toBeVisible({ timeout: 10_000 });
    await confirm.getByRole('button', { name: 'Sí, comprar más' }).click();
    await expect(page.locator('text=Compra adicional registrada')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('div[role="dialog"]')).toContainText('(15/10)');
  });

  test('el teléfono del cliente no acepta más de 9 dígitos ni menos de 6', async ({ page }) => {
    await page.goto('/clientes');
    await page.click('button:has-text("Nuevo cliente")');
    await page.fill('#name', `QA Telefono ${wordStamp()}`);

    // Más de 9: el campo corta en 9 dígitos y descarta lo que no es número.
    await page.locator('#phone').pressSequentially('98a7654321099');
    await expect(page.locator('#phone')).toHaveValue('987654321');

    // Menos de 6: no deja guardar y explica por qué.
    await page.fill('#phone', '12345');
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=El teléfono debe tener entre 6 y 9 dígitos')).toBeVisible();
    await expect(page.locator('text=Cliente creado correctamente')).toHaveCount(0);
  });

  test('"Inicio" es la primera opción del menú y lleva al panel principal', async ({ page }) => {
    await page.goto('/clientes');
    const sidebar = page.locator('[data-slot="sidebar"]');
    await sidebar.getByRole('link', { name: 'Inicio', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1', { hasText: 'Panel principal' })).toBeVisible();
  });

  test('el menú usa los nuevos nombres', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]');
    for (const label of ['Generales', 'Usuarios', 'Lista de precios', 'Pagos recibidos']) {
      await expect(sidebar.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('Deudas a personal arranca filtrada en "Pendientes de pagar"', async ({ page }) => {
    await page.goto('/deudas-personal');
    await expect(page.getByRole('combobox', { name: 'Estado' })).toContainText('Pendientes de pagar');

    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Ya pagadas' }).click();
    await expect(page.locator('th', { hasText: 'Ya pagado' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'Pendiente de pagar' })).toHaveCount(0);

    await page.click('button:has-text("Limpiar filtros")');
    await expect(page.getByRole('combobox', { name: 'Estado' })).toContainText('Pendientes de pagar');
  });
});
