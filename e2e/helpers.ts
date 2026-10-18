import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// Sufijo único por corrida para nombres de entidades creadas por las
// pruebas (cliente/producto/usuario de prueba, etc.) — evita colisiones de
// unicidad (email, document_number) entre corridas repetidas de la suite
// contra la misma base de datos.
export function stamp(): string {
  return Date.now().toString().slice(-8);
}

// Variante del stamp anterior que solo usa letras (cada dígito -> una letra
// a-j) — necesaria para nombres de CLIENTE: su schema exige puro
// `/^[A-Za-zÀ-ÖØ-öø-ÿ\s'.-]+$/` (client.schema.ts), así que un sufijo
// numérico como el de `stamp()` dispara "El nombre solo puede tener letras".
export function wordStamp(): string {
  return stamp()
    .split('')
    .map((digit) => String.fromCharCode(97 + Number(digit)))
    .join('');
}

// Selecciona una opción de un <Select> (shadcn/Radix) ubicando el
// combobox dentro del `div.space-y-2` más cercano que contenga labelText.
// Usar SIEMPRE esta variante (no `page.locator('label')` directo) porque
// varios campos pueden compartir un contenedor padre con texto similar.
export async function chooseSelect(page: Page, labelText: string, optionText: string) {
  const field = page.locator('div.space-y-2', { hasText: labelText }).last();
  const trigger = field.locator('button[role="combobox"]').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[role="option"]', { hasText: optionText }).first().click();
}

// Igual que chooseSelect pero exige texto EXACTO de la opción — necesario
// cuando una opción es prefijo de otra (ej. "Administrador" vs "Super
// Administrador").
export async function chooseSelectExact(page: Page, labelText: string, optionText: string) {
  const field = page.locator('div.space-y-2', { hasText: labelText }).last();
  const trigger = field.locator('button[role="combobox"]').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[role="option"]', { hasText: new RegExp(`^${optionText}$`) }).first().click();
}

// Variante para selects cuyo <label> vive en un contenedor propio (no
// `div.space-y-2` compartido con otros campos de la misma fila).
export async function chooseSelectNear(page: Page, labelText: string, optionText: string) {
  const label = page.locator('label', { hasText: new RegExp(`^${labelText}$`) }).last();
  const container = label.locator('xpath=..');
  const trigger = container.locator('button[role="combobox"]').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  await page.locator('[role="option"]', { hasText: optionText }).first().click();
}

// SearchableSelect (Popover+Command): localizarlo por el trigger `button`
// que sigue al <label> indicado, escribir en el buscador y elegir la opción.
export async function chooseSearchableSelect(page: Page, labelText: string, optionText: string) {
  const label = page.locator('label', { hasText: new RegExp(`^${labelText}$`) }).last();
  const container = label.locator('xpath=..');
  const trigger = container.locator('button[role="combobox"]').first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
  await popover.waitFor({ state: 'visible' });
  await popover.locator('[cmdk-input]').fill(optionText);
  await popover.locator('[cmdk-item]', { hasText: optionText }).first().click();
}

// Día del mes de HOY en la zona del negocio (Lima). Útil para registrar
// movimientos que deben quedar en la primera página de listas ordenadas por
// fecha desc, sin importar cuántos datos de días anteriores haya.
export function businessTodayDay(): number {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', day: 'numeric' }).format(new Date()));
}

// DateField: el popover del Calendar se porta fuera del subtree del Dialog
// (Radix lo monta en <body>), así que NO se escopea a `div[role=dialog]`.
export async function pickDate(page: Page, fieldId: string, dayNumber: number) {
  await page.click(`#${fieldId}`);
  const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
  await popover.waitFor({ state: 'visible' });
  await popover
    .locator('button', { hasText: new RegExp(`^${dayNumber}$`) })
    .first()
    .click();
}

// Espera a que la tabla (o el empty-state) de un listado termine de cargar —
// mismo criterio en todas las vistas de catálogo (CLAUDE.md sección 7:
// DataTable compartido).
export async function waitForTableReady(page: Page) {
  await page.locator('table, text=No hay resultados, text=Sin resultados').first().waitFor({ state: 'visible' });
}

export async function expectNoConsoleErrors(page: Page, allowList: RegExp[] = []) {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (allowList.some((pattern) => pattern.test(text))) return;
    errors.push(text);
  });
  return () => expect(errors, `Errores de consola inesperados: ${errors.join(' | ')}`).toHaveLength(0);
}
