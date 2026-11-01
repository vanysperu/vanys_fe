import { expect, test } from '@playwright/test';

import { ADMIN_STATE, GESTOR_STATE } from '../auth';
import { chooseSearchableSelect, openMenuGroup, stamp, wordStamp, waitForToastsToClear } from '../helpers';

test.use({ storageState: ADMIN_STATE });

test.describe('Origen de fondos de una compra y Deudas a personal', () => {
  test('registrar una compra con plata propia genera una deuda, visible y saldable en /deudas-personal', async ({ page }) => {
    const suffix = stamp();
    const clientName = `QA Cliente Deuda ${wordStamp()}`;
    const productName = `QA Producto Deuda ${suffix}`;
    const techniqueName = `QA Técnica Deuda ${suffix}`;

    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', clientName);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible({ timeout: 10_000 });

    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', productName);
    await page.fill('#quick-product-price-unit', '20');
    // Estos productos se cotizan con técnica: hay que marcarlos.
    await page.click('#quick-product-requires-customization');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible({ timeout: 10_000 });

    await page.click('button[title="Nueva técnica"]');
    await page.fill('#quick-technique-name', techniqueName);
    await page.fill('#quick-technique-price-unit', '5');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada')).toBeVisible({ timeout: 10_000 });

    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '10');
    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible({ timeout: 10_000 });

    await waitForToastsToClear(page);
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.click(`span:has-text("${clientName}")`);
    const detailDialog = page.locator('div[role="dialog"]', { hasText: /^Cotización #/ });
    await expect(detailDialog).toBeVisible();

    // Solo una cotización aceptada admite órdenes de compra, compras y pagos:
    // se acepta sin adelanto.
    await detailDialog.getByRole('button', { name: 'Aceptada' }).click();
    await page
      .locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' })
      .getByRole('button', { name: 'No, aceptar sin adelanto' })
      .click();
    await expect(page.locator('text=Cotización marcada como "Aceptada"')).toBeVisible({ timeout: 10_000 });

    await page.click('div[role="dialog"] [role="tab"]:has-text("Compras")');
    await page.click('div[role="dialog"] button:has-text("Crear orden de compra")');
    await page.locator('div[role="dialog"] label', { hasText: productName }).click();
    await chooseSearchableSelect(page, 'Asignado a', 'Ana Acme');
    await page.click('div[role="dialog"] button:has-text("Crear orden")');
    await expect(page.locator('text=Orden de compra creada')).toBeVisible({ timeout: 10_000 });

    // Registrar la compra del producto pagándola con plata propia.
    await page.click('div[role="dialog"] [role="tab"]:has-text("Compras")');
    await page.click('div[role="dialog"] button[title="Registrar compra"]');
    await page.fill('#purchase-amount', '45');
    await page.click('#purchase-funding-source');
    await page.locator('[role="option"]', { hasText: 'Plata propia' }).click();
    await expect(page.locator('text=Se registrará como una deuda')).toBeVisible();
    await page.click('div[role="dialog"] button:has-text("Guardar compra")');
    await expect(page.locator('text=Compra registrada')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('div[role="dialog"]')).toContainText('incluye plata propia');

    await page.keyboard.press('Escape');

    // Debe aparecer en "Deudas a personal", agrupada por trabajador.
    await page.goto('/deudas-personal');
    const debtRow = page.locator('tr', { hasText: 'Ana Acme' });
    await expect(debtRow).toBeVisible();

    await debtRow.getByRole('button', { name: 'Marcar como pagado' }).click();
    await expect(page.locator('div[role="dialog"]', { hasText: 'Marcar deuda como pagada' })).toBeVisible();
    await page.click('div[role="dialog"] button:has-text("Marcar como pagado")');
    await expect(page.locator('text=Deuda saldada correctamente')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('tr', { hasText: 'Ana Acme' })).toHaveCount(0);

    // Con el filtro "Ya pagadas" sí aparece.
    await page.getByRole('combobox', { name: 'Estado' }).click();
    await page.getByRole('option', { name: 'Ya pagadas' }).click();
    await expect(page.locator('tr', { hasText: 'Ana Acme' })).toBeVisible();

    // En Caja, el gasto de la compra dice quién lo pagó y que ya se le repuso,
    // pero no mueve caja; la reposición es el egreso, en su propia fila.
    await page.goto('/caja');
    const expenseRow = page.locator('tr', { hasText: productName });
    await expect(expenseRow).toContainText('Pagado por Ana Acme con su plata');
    await expect(expenseRow).toContainText('ya repuesto');
    await expect(expenseRow).toContainText('no mueve caja');
    const reimbursementRow = page.locator('tr', { hasText: 'Reposición a Ana Acme' }).first();
    await expect(reimbursementRow).toContainText('Efectivo');
  });
});

test.describe('Deuda manual con un trabajador', () => {
  test('se registra, se ve en Caja sin mover caja y se anula desde el detalle', async ({ page }) => {
    const description = `QA Luz ${stamp()}`;

    await page.goto('/deudas-personal');
    await page.getByRole('button', { name: 'Registrar deuda' }).click();
    const dialog = page.locator('div[role="dialog"]', { hasText: 'Registrar deuda con un trabajador' });
    await expect(dialog).toBeVisible();
    await chooseSearchableSelect(page, 'Trabajador que puso el dinero', 'Ana Acme');
    await page.fill('#manual-debt-description', description);
    await chooseSearchableSelect(page, 'Categoría del gasto', 'Pago de servicios');
    await page.fill('#manual-debt-amount', '12.34');
    await dialog.getByRole('button', { name: 'Registrar deuda' }).click();
    await expect(page.locator('text=Deuda registrada')).toBeVisible({ timeout: 10_000 });

    // En Caja se ve quién lo pagó, pero no suma: no salió plata de la empresa.
    await page.goto('/caja');
    await page.getByRole('combobox', { name: 'Origen' }).click();
    await page.getByRole('option', { name: 'Pagado por un trabajador' }).click();
    const cashRow = page.locator('tr', { hasText: description });
    await expect(cashRow).toContainText('no mueve caja');
    await expect(cashRow).toContainText('Pagado por Ana Acme con su plata');

    // Se anula desde el detalle del trabajador (todavía no se le repuso nada).
    await page.goto('/deudas-personal');
    await page.locator('tr', { hasText: 'Ana Acme' }).getByRole('button', { name: 'Ver detalle' }).click();
    const detail = page.locator('div[role="dialog"]', { hasText: 'Deudas con' });
    const debtRow = detail.locator('tr', { hasText: description });
    await expect(debtRow).toContainText('Pendiente');
    await debtRow.getByRole('button', { name: 'Anular deuda' }).click();
    await page
      .locator('div[role="dialog"]', { hasText: '¿Anular esta deuda?' })
      .getByRole('button', { name: 'Anular deuda' })
      .click();
    await expect(page.locator('text=Deuda anulada')).toBeVisible({ timeout: 10_000 });
    await expect(detail.locator('tr', { hasText: description })).toContainText('Anulada');
  });
});

test.describe('Deudas a personal — RBAC de Gestor (exclusivo de Administrador)', () => {
  test.use({ storageState: GESTOR_STATE });

  test('un Gestor no ve "Deudas a personal" en el sidebar y no puede entrar por URL directa', async ({ page }) => {
    await page.goto('/');
    // Se abre "Finanzas" para que la ausencia sea real y no solo un grupo cerrado.
    await openMenuGroup(page, 'Finanzas');
    await expect(page.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Caja', exact: true })).toBeVisible();
    await expect(page.locator('a, button', { hasText: 'Deudas a personal' })).toHaveCount(0);

    // Shell.tsx redirige a "/" cuando la ruta no está en las vistas
    // otorgadas por el rol (GET /access/me) — mismo guard que ya cubre
    // "Empresas"/"Tiendas" para un admin de empresa (navigation-smoke.spec.ts).
    await page.goto('/deudas-personal');
    await expect(page).toHaveURL('/');
  });
});
