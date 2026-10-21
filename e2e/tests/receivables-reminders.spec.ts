import { expect, type Page, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// Crea una cotización de 10 unidades a (20 + 5) = S/ 250.00 desde el
// formulario y abre su detalle. Devuelve el nombre del cliente.
async function createQuotationAndOpenDetail(page: Page): Promise<string> {
  const suffix = stamp();
  const clientName = `QA Cliente Cobro ${wordStamp()}`;

  await page.goto('/cotizaciones');
  await page.click('button:has-text("Nueva cotización")');
  await page.click('button[title="Nuevo cliente"]');
  await page.fill('#quick-client-name', clientName);
  await page.click('div[role="dialog"] button:has-text("Crear cliente")');
  await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

  await page.click('button[title="Nuevo producto"]');
  await page.fill('#quick-product-name', `QA Producto Cobro ${suffix}`);
  await page.fill('#quick-product-price-unit', '20');
  // Estos productos se cotizan con técnica: hay que marcarlos.
  await page.click('#quick-product-requires-customization');
  await page.click('div[role="dialog"] button:has-text("Crear producto")');
  await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

  await page.click('button[title="Nueva técnica"]');
  await page.fill('#quick-technique-name', `QA Técnica Cobro ${suffix}`);
  await page.fill('#quick-technique-price-unit', '5');
  await page.click('div[role="dialog"] button:has-text("Crear técnica")');
  await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

  await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
  await page.click('div[role="dialog"] button:has-text("Crear cotización")');
  await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: 'Lista', exact: true }).click();
  await page.click(`span:has-text("${clientName}")`);
  await expect(page.locator('div[role="dialog"]', { hasText: /^Cotización #/ })).toBeVisible();
  return clientName;
}

// Fecha y hora actuales en Lima, como las pide el formulario.
function limaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')}`;
}

test.describe('Adelanto al aceptar y Por cobrar', () => {
  test('al aceptar pregunta por el adelanto con la mitad sugerida, lo registra y queda en "Por cobrar"', async ({ page }) => {
    const clientName = await createQuotationAndOpenDetail(page);
    const detail = page.locator('div[role="dialog"]', { hasText: /^Cotización #/ });

    await detail.getByRole('button', { name: 'Aceptada' }).click();
    const advance = page.locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' });
    await expect(advance).toBeVisible();
    // Mitad de S/ 250.00.
    await expect(page.locator('#advance-amount')).toHaveValue('125');

    await page.fill('#advance-amount', '100');
    await advance.getByRole('button', { name: 'Sí, registrar adelanto' }).click();
    await expect(page.locator('text=Cotización aceptada y adelanto registrado')).toBeVisible({ timeout: 10_000 });
    await expect(advance).toBeHidden();
    await expect(detail).toContainText('S/ 100.00');
    await expect(detail.locator('span', { hasText: 'Aceptada' }).first()).toBeVisible();

    await page.keyboard.press('Escape');

    await page.goto('/por-cobrar');
    await page.fill('input[placeholder="Buscar cliente..."]', clientName);
    const row = page.locator('tr', { hasText: clientName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('S/ 150.00');
    await expect(row).toContainText('Aceptada');
  });

  test('"No, aceptar sin adelanto" acepta sin registrar pago', async ({ page }) => {
    await createQuotationAndOpenDetail(page);
    const detail = page.locator('div[role="dialog"]', { hasText: /^Cotización #/ });

    await detail.getByRole('button', { name: 'Aceptada' }).click();
    const advance = page.locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' });
    await advance.getByRole('button', { name: 'No, aceptar sin adelanto' }).click();
    await expect(page.locator('text=Cotización marcada como "Aceptada"')).toBeVisible({ timeout: 10_000 });
    await expect(advance).toBeHidden();
    await expect(detail.getByRole('button', { name: 'Diseño en aprobación' })).toBeVisible();
    await detail.getByRole('tab', { name: 'Pagos' }).click();
    await expect(detail).toContainText('Sin pagos registrados.');
  });

  test('cerrar el modal no cambia el estado', async ({ page }) => {
    await createQuotationAndOpenDetail(page);
    const detail = page.locator('div[role="dialog"]', { hasText: /^Cotización #/ });

    await detail.getByRole('button', { name: 'Aceptada' }).click();
    const advance = page.locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' });
    await expect(advance).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(advance).toBeHidden();
    // Sigue pendiente: el botón para aceptar sigue ahí.
    await expect(detail.getByRole('button', { name: 'Aceptada' })).toBeVisible();
  });
});

test.describe('Recordatorios', () => {
  test('programar un recordatorio para mí: suena en la campana y se marca como visto', async ({ page }) => {
    const title = `QA Recordatorio ${wordStamp()}`;

    await page.goto('/recordatorios');
    await page.getByRole('button', { name: 'Nuevo recordatorio' }).click();
    await page.fill('#reminder-title', title);
    await page.fill('#reminder-message', 'Llamar para cobrar el adelanto');
    // Hora actual de Lima: vence de inmediato.
    await page.fill('#reminder-time', limaNow());
    await page.getByRole('button', { name: 'Programar recordatorio' }).click();
    await expect(page.locator('text=Recordatorio programado')).toBeVisible({ timeout: 10_000 });

    // Aviso (toast) y campana con contador.
    await expect(page.locator('[data-sonner-toast]', { hasText: title })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('reminder-bell-count')).toBeVisible();

    const row = page.locator('tr', { hasText: title });
    await expect(row).toContainText('Pendiente de ver');

    await page.getByRole('button', { name: /^Recordatorios: \d+ pendientes?$/ }).click();
    const bellItem = page.getByTestId('reminder-bell-item').filter({ hasText: title });
    await expect(bellItem).toBeVisible();
    await bellItem.getByRole('button', { name: `Marcar "${title}" como visto` }).click();
    await expect(bellItem).toBeHidden({ timeout: 10_000 });
    await page.keyboard.press('Escape');

    await expect(page.locator('tr', { hasText: title })).toContainText('Visto');
  });

  test('un recordatorio futuro queda programado y se puede cancelar', async ({ page }) => {
    const title = `QA Futuro ${wordStamp()}`;

    await page.goto('/recordatorios');
    await page.getByRole('button', { name: 'Nuevo recordatorio' }).click();
    await page.fill('#reminder-title', title);
    // Hora por defecto: la próxima hora en punto (siempre futura).
    await page.getByRole('button', { name: 'Programar recordatorio' }).click();
    await expect(page.locator('text=Recordatorio programado')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: 'Programados por mí' }).click();
    const row = page.locator('tr', { hasText: title });
    await expect(row).toContainText('Programado');

    await row.getByRole('button', { name: 'Deshabilitar recordatorio' }).click();
    await expect(page.locator('text=Recordatorio cancelado')).toBeVisible({ timeout: 10_000 });
    // Cancelado sale del listado por defecto (que oculta los cancelados).
    await expect(page.locator('tr', { hasText: title })).toHaveCount(0);
  });

  test('no deja programar en el pasado', async ({ page }) => {
    await page.goto('/recordatorios');
    await page.getByRole('button', { name: 'Nuevo recordatorio' }).click();
    await page.fill('#reminder-title', `QA Pasado ${wordStamp()}`);
    await page.fill('#reminder-time', '00:00');
    await page.getByRole('button', { name: 'Programar recordatorio' }).click();
    await expect(page.locator('text=Esa fecha y hora ya pasaron')).toBeVisible();
  });
});
