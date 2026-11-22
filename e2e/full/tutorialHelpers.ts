import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { waitForToastsToClear } from '../helpers';

// Cómo sigue una persona una lección del modo enseñanza (lo usan las pruebas
// del modo enseñanza): mira el título del paso y hace lo que pide.

export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// Pestaña con diagnóstico: si se cae o la app tira un error, queda en la salida.
export const newWatchedPage = async (browser: Browser, label: string): Promise<[BrowserContext, Page]> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('crash', () => console.log(`[${label}] la pestaña se cayó (crash) en ${page.url()}`));
  page.on('pageerror', (error) => console.log(`[${label}] error de la página en ${page.url()}: ${error.message}`));
  return [context, page];
};

export const stepTitle = (page: Page) => page.getByTestId('tutorial-step-title');
export const expectStep = (page: Page, title: string | RegExp) => expect(stepTitle(page)).toHaveText(title, { timeout: 15_000 });
export const ack = async (page: Page, title: string | RegExp) => {
  await expectStep(page, title);
  await page.getByTestId('tutorial-ack').click();
};
export const detail = (page: Page) => page.getByRole('dialog', { name: /^Cotización #\d+$/ });

// La mano nunca queda debajo del cuadro del paso ni encima de lo iluminado
// (pedido del usuario: "la mano no debe ser tapada por el cuadro ni tapar las letras").
export const expectHandClear = async (page: Page) => {
  const hand = await page.getByTestId('tutorial-hand').boundingBox();
  const card = await page.locator('[data-tutorial-card]').boundingBox();
  const ring = await page.getByTestId('tutorial-ring').boundingBox();
  expect(hand, 'la mano está en pantalla').not.toBeNull();
  const overlaps = (a: typeof hand, b: typeof hand) =>
    a !== null && b !== null && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlaps(hand, card), 'el cuadro tapa la mano').toBe(false);
  expect(overlaps(hand, ring), 'la mano tapa lo iluminado').toBe(false);
};

// Paso "Abre ...": por el menú, abriendo el grupo si está cerrado.
export const openFromMenu = async (page: Page, label: string, path: string, group?: string) => {
  await expectStep(page, `Abre "${label}"`);
  const link = page.locator(`[data-slot="sidebar"] a[href="${path}"]`, { hasText: label });
  if (group && !(await link.isVisible())) {
    await page.locator('[data-slot="sidebar"]').getByRole('button', { name: group, exact: true }).click();
  }
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/' : path}$`));
};

// Paso "Abre COT-0001": el número sale del título del paso.
export const openPreparedQuotation = async (page: Page) => {
  await expectStep(page, /^Abre COT-\d{4}$/);
  const id = Number(((await stepTitle(page).textContent()) ?? '').replace(/\D/g, ''));
  await page.locator(`[data-testid="quotations-board"] [data-quotation-id="${id}"]`).click();
  await expect(detail(page)).toBeVisible();
};

export const openTab = async (page: Page, tab: string) => {
  await expectStep(page, `Entra a la pestaña "${tab}"`);
  await detail(page).getByRole('tab', { name: tab }).click();
};

export const markStatus = async (page: Page, label: string) => {
  await expectStep(page, `Marca "${label}"`);
  await detail(page).getByRole('button', { name: label, exact: true }).click();
};

export const finishLesson = async (page: Page) => {
  const finished = page.getByTestId('tutorial-finished');
  await expect(finished).toBeVisible({ timeout: 15_000 });
  await finished.getByRole('button', { name: 'Ver todas las lecciones' }).click();
  await expect(page).toHaveURL(/\/aprender$/);
};

export const startLesson = async (page: Page, code: string) => {
  await expect(page).toHaveURL(/\/aprender$/);
  await waitForToastsToClear(page);
  await page.getByTestId(`lesson-${code}`).getByRole('button').click();
  await expect(page.locator('[data-tutorial-card]')).toBeVisible({ timeout: 15_000 });
};

// "N de M lecciones": cuántas lecciones le tocan a este rol (depende de sus
// permisos y de lo que su empresa tiene contratado).
export const lessonsTotal = async (page: Page): Promise<number> => {
  const text = (await page.getByTestId('course-progress').textContent()) ?? '';
  const match = /de (\d+) lecciones/.exec(text);
  return Number(match?.[1] ?? 0);
};
