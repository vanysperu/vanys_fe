import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import { SUPERADMIN_STATE } from '../auth';
import {
  apiJson,
  createDisposableCashCompany,
  limaMonthDate,
  loginViaUi,
  pageAuthToken,
  periodTitleOf,
  storedAuthToken,
  waitForToastsToClear,
  wordStamp,
  type DisposableCashCompany,
} from '../helpers';

// Flujo del cierre mensual de caja con una empresa DESECHABLE (los cierres no
// se pueden borrar; nunca se configura la caja de "Acme Corp QA"). Los
// usuarios de la empresa se crean por API en el setup y entran por la UI.
// Dos meses cerrables: hace 2 meses (P0) y el mes pasado (P1).
const P0_DATE = limaMonthDate(2, 5);
const P1_DATE = limaMonthDate(1, 5);
const P0_TITLE = periodTitleOf(P0_DATE);
const P1_TITLE = periodTitleOf(P1_DATE);
const P0_KEY = P0_DATE.slice(0, 7);
const P1_KEY = P1_DATE.slice(0, 7);

interface Envelope<T> {
  success: boolean;
  data: T;
  code?: string;
}

test.describe.configure({ mode: 'serial' });

test.describe('Cierre de caja', () => {
  let company: DisposableCashCompany;
  let adminContext: BrowserContext;
  let admin: Page;
  let adminToken = '';
  const description = `QA cierre ${wordStamp().slice(0, 8)}`;

  // Movimiento manual de ingreso por API (fechado en un mes aún abierto).
  const createIncome = async (suffix: string, date: string, amount: number) => {
    const res = await apiJson<Envelope<{ id: number }>>(admin.request, 'post', '/cash-movement/create', adminToken, {
      direction: 'income',
      category: 'otro_ingreso',
      amount,
      description: `${description} ${suffix}`,
      occurred_at: date,
      payment_account_id: company.bankAccountId,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  };

  const closeMonth = async (periodKey: string, title: string) => {
    await admin.goto('/caja/cierres');
    await admin.getByTestId(`period-${periodKey}`).click();
    await admin.getByTestId('close-period-button').click();
    await expect(admin.getByRole('dialog').getByText(`Cerrar ${title.toLowerCase()}`)).toBeVisible();
    await admin.getByTestId('close-period-review').click();
    await expect(admin.getByText(`¿Cerrar ${title.toLowerCase()}?`)).toBeVisible();
    await admin.getByRole('button', { name: 'Sí, cerrar el mes' }).click();
    await expect(admin.getByText(`${title} cerrado correctamente`)).toBeVisible({ timeout: 10_000 });
  };

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

  test('1. sin configurar, la caja pide el saldo inicial por cuenta', async () => {
    await admin.goto('/caja/cierres');
    await expect(admin.getByTestId('cash-not-started')).toContainText('Todavía no se configuró la caja');
    await admin.getByTestId('opening-cta').click();

    const dialog = admin.getByTestId('cash-opening-dialog');
    await expect(dialog).toContainText('Saldo inicial de la caja');
    // Mes de inicio: hace dos meses, para poder cerrar dos meses seguidos.
    await dialog.getByTestId('opening-start-period').click();
    await admin.getByRole('option', { name: P0_TITLE }).click();
    await dialog.locator('#opening-amount-0').fill('100');
    await dialog.locator(`#opening-amount-${company.bankAccountId}`).fill('1000');
    await expect(dialog.getByText('Según lo registrado antes de esa fecha').first()).toBeVisible();
    await dialog.getByTestId('opening-save').click();
    await expect(admin.getByText('Saldo inicial guardado')).toBeVisible({ timeout: 10_000 });
    await expect(admin.getByTestId(`period-${P0_KEY}`)).toBeVisible();
  });

  test('2. movimientos con fecha pasada, ya con la caja configurada', async () => {
    await createIncome('p0', P0_DATE, 50);
    await createIncome('p1a', P1_DATE, 80);
    await createIncome('p1b', P1_DATE, 20);
  });

  test('3. cerrar un mes: vista previa, ecuación y confirmación', async () => {
    await admin.goto('/caja/cierres');
    await admin.getByTestId(`period-${P0_KEY}`).click();
    await expect(admin.getByTestId('cash-balance-equation')).toContainText('Saldo inicial');
    await expect(admin.getByTestId('cash-balance-equation')).toContainText('Vista previa');

    await closeMonth(P0_KEY, P0_TITLE);
    await closeMonth(P1_KEY, P1_TITLE);

    await admin.goto('/caja/cierres');
    await admin.getByTestId(`period-${P1_KEY}`).click();
    await expect(admin.getByTestId('cash-period-detail').getByTestId('cash-period-status')).toContainText('Cerrado');
  });

  test('4. Caja muestra el candado del mes cerrado y los saldos por cuenta', async () => {
    await admin.goto('/caja');
    const panel = admin.getByTestId('cash-balances-panel');
    await expect(panel).toContainText('Saldos de caja');
    // Plegable: cerrado muestra el total y el contador de cuentas; al abrir, las tarjetas.
    await expect(admin.getByTestId('cash-balances-count')).toBeVisible();
    const toggle = panel.getByRole('button', { name: /Mostrar|Ocultar/ });
    if ((await toggle.textContent())?.includes('Mostrar')) await toggle.click();
    await expect(admin.getByTestId('cash-balance-card').first()).toBeVisible();
    const row = admin.locator('tr', { hasText: `${description} p1a` });
    await expect(row.getByTestId('period-lock-icon')).toBeVisible();
  });

  test('5. corregir un movimiento de un mes cerrado: aviso, ajuste de hoy y valor al cierre', async () => {
    await admin.goto('/caja');
    await admin.locator('tr', { hasText: `${description} p1a` }).getByTitle('Corregir').click();

    const dialog = admin.getByRole('dialog');
    await expect(dialog.getByTestId('closed-period-notice')).toContainText('mes cerrado');
    await dialog.locator('#cash-movement-edit-amount').fill('60');
    await dialog.locator('#cash-movement-edit-reason').fill('Se anotó mal el depósito');
    await dialog.getByRole('button', { name: 'Guardar corrección' }).click();
    await admin.getByRole('button', { name: 'Sí, corregir' }).click();
    await expect(admin.getByText('Movimiento corregido correctamente')).toBeVisible({ timeout: 10_000 });

    await expect(admin.getByTestId('adjustment-row').first()).toBeVisible();
    await expect(admin.getByTestId('closing-hold-row').first()).toBeVisible();
    await expect(admin.getByText('Valor al cierre').first()).toBeVisible();
  });

  test('6. anular un movimiento de un mes cerrado pide el motivo', async () => {
    await waitForToastsToClear(admin);
    await admin.goto('/caja');
    await admin.locator('tr', { hasText: `${description} p1b` }).getByTitle('Deshabilitar movimiento').click();

    const dialog = admin.getByTestId('adjustment-reason-dialog');
    await expect(dialog).toContainText('Anular un movimiento de un mes cerrado');
    await dialog.locator('#adjustment-reason').fill('El cliente pidió la devolución');
    await dialog.getByRole('button', { name: 'Anular y registrar ajuste' }).click();
    await expect(admin.getByText(/anulado como ajuste de un mes cerrado/)).toBeVisible({ timeout: 10_000 });
  });

  test('7. reabrir un mes con motivo: chip Reabierto y meses posteriores provisionales', async () => {
    await waitForToastsToClear(admin);
    await admin.goto('/caja/cierres');
    await admin.getByTestId(`period-${P0_KEY}`).click();
    await admin.getByTestId('reopen-period-button').click();

    const dialog = admin.getByTestId('reopen-period-dialog');
    await dialog.locator('#reopen-period-reason').fill('Falta registrar un depósito');
    await dialog.getByRole('button', { name: 'Continuar' }).click();
    await admin.getByRole('button', { name: 'Reabrir mes' }).click();
    await expect(admin.getByText(`${P0_TITLE} reabierto`)).toBeVisible({ timeout: 10_000 });

    await expect(admin.getByTestId('cash-period-detail').getByTestId('cash-period-status')).toContainText('Reabierto');
    await expect(admin.getByTestId('cash-period-provisional')).toBeVisible();
  });

  test('8. volver a cerrar el mes reabierto', async () => {
    await waitForToastsToClear(admin);
    await closeMonth(P0_KEY, P0_TITLE);
    await admin.goto('/caja/cierres');
    await admin.getByTestId(`period-${P0_KEY}`).click();
    await expect(admin.getByTestId('cash-period-detail').getByTestId('cash-period-status')).toContainText('Cerrado');
    await expect(admin.getByTestId('cash-period-provisional')).toHaveCount(0);
  });

  test('9. un gestor no ve Cierres de caja y no puede registrar con fecha de un mes cerrado', async ({ browser }) => {
    const gestorContext = await browser.newContext();
    const gestor = await gestorContext.newPage();
    try {
      await loginViaUi(gestor, company.gestorEmail, company.password);
      await expect(gestor.locator('[data-slot="sidebar"]').getByText('Cierres de caja')).toHaveCount(0);

      await gestor.goto('/caja/cierres');
      // La ruta no está permitida: vuelve al inicio.
      await expect(gestor).toHaveURL('/');

      const res = await apiJson<Envelope<unknown>>(gestor.request, 'post', '/cash-movement/create', await pageAuthToken(gestor), {
        direction: 'income',
        category: 'otro_ingreso',
        amount: 10,
        description: `${description} gestor`,
        occurred_at: P1_DATE,
      });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CASH_PERIOD_CLOSED');
    } finally {
      await gestorContext.close();
    }
  });
});
