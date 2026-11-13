import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import {
  apiJson,
  createDisposableCashCompany,
  loginViaUi,
  openMenuGroup,
  pageAuthToken,
  storedAuthToken,
  waitForToastsToClear,
  wordStamp,
  type DisposableCashCompany,
} from '../helpers';

// Valores de los nombres de columna, en el orden de la pantalla.
const stageNames = (page: Page) =>
  page
    .getByTestId('workflow-stage-row')
    .locator('input[aria-label^="Nombre de la columna"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value));

interface Envelope<T> {
  success: boolean;
  data: T;
}

// Sprint 2, ítem 5: cada empresa configura las columnas del kanban de
// producción y cómo avanzan los productos. Empresa DESECHABLE: cambiar el
// flujo de "Acme Corp QA" rompería las demás suites.
test.describe.configure({ mode: 'serial' });

test.describe('Flujo de producción', () => {
  let company: DisposableCashCompany;
  let adminContext: BrowserContext;
  let admin: Page;
  let adminToken = '';
  const columnName = `Bordado ${wordStamp().slice(0, 4)}`;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    admin = await adminContext.newPage();
    company = await createDisposableCashCompany(admin.request, storedAuthToken(SUPERADMIN_STATE));
    await loginViaUi(admin, company.adminEmail, company.password);
    adminToken = await pageAuthToken(admin);
  });

  test.afterAll(async () => {
    await adminContext.close();
  });

  test('1. desde el menú: nace con las 4 columnas de siempre en modo lineal', async () => {
    await openMenuGroup(admin, 'Configuración');
    await admin.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Flujo de producción' }).click();
    await expect(admin).toHaveURL('/configuracion/flujo-produccion');

    const rows = admin.getByTestId('workflow-stage-row');
    await expect(rows).toHaveCount(4);
    await expect.poll(() => stageNames(admin)).toEqual(['Diseño', 'Insumos', 'Producción', 'Listo']);
    await expect(admin.getByRole('radio', { name: /Lineal/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('2. agrega una columna, la reordena, cambia a modo libre y guarda', async () => {
    const rows = admin.getByTestId('workflow-stage-row');
    await admin.getByRole('radio', { name: /Libre/ }).click();
    await admin.getByRole('button', { name: 'Agregar columna' }).click();
    // Entra antes de "Listo" (la última es de tipo terminado).
    await expect(rows).toHaveCount(5);
    await rows.nth(3).getByPlaceholder('Nombre de la columna').fill(columnName);
    await expect(rows.nth(3).getByRole('combobox')).toHaveText('En curso');
    await admin.getByRole('button', { name: `Subir ${columnName}` }).click();

    await expect(admin.getByText('Tienes cambios sin guardar')).toBeVisible();
    await admin.getByRole('button', { name: 'Guardar' }).click();
    await expect(admin.getByText('Flujo de producción guardado')).toBeVisible({ timeout: 10_000 });

    await admin.reload();
    await expect.poll(() => stageNames(admin)).toEqual(['Diseño', 'Insumos', columnName, 'Producción', 'Listo']);
    await expect(admin.getByRole('radio', { name: /Libre/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('3. el kanban de una cotización usa esas columnas, en ese orden', async () => {
    const stamp = wordStamp();
    const client = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/client/create', adminToken, {
      company_id: company.companyId,
      name: `FlujoCliente${stamp}`,
    });
    const product = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/product/create', adminToken, {
      company_id: company.companyId,
      name: `FlujoProducto${stamp}`,
      price_unit: 10,
    });
    const quotation = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/quotation/create', adminToken, {
      company_id: company.companyId,
      client_id: client.body.data.id,
      items: [{ product_id: product.body.data.id, quantity: 3, pricing_mode: 'unit' }],
    });
    expect(quotation.status, JSON.stringify(quotation.body)).toBe(201);
    const accepted = await apiJson<Envelope<unknown>>(admin.request, 'put', `/quotation/status/${quotation.body.data.id}`, adminToken, {
      status: 'accepted',
    });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);

    await admin.goto('/cotizaciones');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Lista', exact: true }).click();
    await admin.click(`span:has-text("FlujoCliente${stamp}")`);

    const columns = admin.getByTestId('kanban-stage-column');
    await expect(columns.locator('span.truncate')).toHaveText(['Diseño', 'Insumos', columnName, 'Producción', 'Listo']);
    // El producto entra por la primera columna.
    await expect(columns.first()).toContainText(`FlujoProducto${stamp}`);
  });
});
