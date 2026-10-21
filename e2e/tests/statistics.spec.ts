import { expect, test } from '@playwright/test';

import { ADMIN_STATE, GESTOR_STATE } from '../auth';

test.describe('Estadísticas', () => {
  test.use({ storageState: ADMIN_STATE });

  test('se abre desde el menú (justo después de Inicio) y muestra indicadores y gráficas', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('[data-slot="sidebar"]');
    await expect(sidebar.getByRole('link', { name: 'Estadísticas', exact: true })).toBeVisible();
    // Orden del menú: "Estadísticas" va inmediatamente después de "Inicio".
    const linkTexts = (await sidebar.locator('a').allTextContents()).map((text) => text.trim());
    expect(linkTexts.indexOf('Estadísticas')).toBe(linkTexts.indexOf('Inicio') + 1);
    await sidebar.getByRole('link', { name: 'Estadísticas', exact: true }).click();

    await expect(page).toHaveURL(/\/estadisticas$/);
    await expect(page.locator('h1', { hasText: 'Estadísticas' })).toBeVisible();
    await expect(page.getByTestId('statistics-period')).toContainText('se compara con');

    for (const kpi of ['kpi-collected', 'kpi-quoted', 'kpi-won', 'kpi-conversion', 'kpi-receivable']) {
      await expect(page.getByTestId(kpi)).toBeVisible();
    }
    // Hay datos de las demás pruebas: las gráficas principales se dibujan.
    await expect(page.getByTestId('chart-income-expenses').locator('.recharts-surface')).toBeVisible();
    await expect(page.getByTestId('chart-quoted-won').locator('.recharts-surface')).toBeVisible();
    await expect(page.getByTestId('table-sellers')).toBeVisible();
  });

  test('cada gráfica tiene su versión en tabla', async ({ page }) => {
    await page.goto('/estadisticas');
    const card = page.getByTestId('chart-income-expenses');
    await expect(card.locator('.recharts-surface')).toBeVisible();

    await card.getByRole('button', { name: 'Tabla' }).click();
    await expect(card.locator('table')).toBeVisible();
    await expect(card.locator('th', { hasText: 'Ingresos' })).toBeVisible();
    await expect(card.locator('th', { hasText: 'Neto' })).toBeVisible();

    await card.getByRole('button', { name: 'Gráfico' }).click();
    await expect(card.locator('.recharts-surface')).toBeVisible();
  });

  test('al pasar el mouse por una barra aparece el detalle', async ({ page }) => {
    await page.goto('/estadisticas');
    const card = page.getByTestId('chart-income-expenses');
    const surface = card.locator('.recharts-surface');
    // Las barras se dibujan cuando la gráfica ya tomó el ancho de la tarjeta
    // (antes se mide con un tamaño inicial): recién ahí se toman coordenadas.
    await expect(card.locator('.recharts-bar-rectangle').first()).toBeVisible();
    const box = await surface.boundingBox();
    if (!box) throw new Error('La gráfica no tiene tamaño');
    // Último tramo (hoy): las pruebas registran movimientos con fecha de hoy.
    // hover() lleva la gráfica a la vista antes de mover el mouse.
    await surface.hover({ position: { x: box.width - 24, y: box.height / 2 } });
    await expect(card.locator('.recharts-tooltip-wrapper')).toContainText('Ingresos');
    await expect(card.locator('.recharts-tooltip-wrapper')).toContainText('Neto');
  });

  test('cambiar el periodo actualiza el tablero y agrupa por mes en rangos largos', async ({ page }) => {
    await page.goto('/estadisticas');
    await expect(page.getByTestId('statistics-period')).toBeVisible();

    await page.getByRole('combobox', { name: 'Periodo' }).click();
    await page.getByRole('option', { name: 'Últimos 12 meses' }).click();

    const year = new Date().getFullYear();
    await expect(page.getByTestId('statistics-period')).toContainText(`/${year - 1}`);
    // 12 meses → el eje de la tendencia muestra meses ("oct. 26"), no días ("21 oct.").
    await expect(
      page.getByTestId('chart-quoted-won').locator('.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value').first(),
    ).toHaveText(/^\D+ \d{2}$/);

    await page.click('button:has-text("Limpiar filtros")');
    await expect(page.getByRole('combobox', { name: 'Periodo' })).toContainText('Últimos 30 días');
  });
});

test.describe('Estadísticas — RBAC de Gestor', () => {
  test.use({ storageState: GESTOR_STATE });

  test('un Gestor no ve Estadísticas en el menú y no puede entrar por URL', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-slot="sidebar"]', { hasText: 'Estadísticas' })).toHaveCount(0);
    await page.goto('/estadisticas');
    await expect(page).toHaveURL(/\/$/);
  });
});
