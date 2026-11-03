import { readFileSync } from 'node:fs';

import type { APIRequestContext, Page } from '@playwright/test';
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
  // :not([data-outside]) — el mismo número de día puede aparecer dos veces
  // en la grilla (relleno del mes anterior/siguiente + el día real del mes
  // mostrado); sin este filtro, `.first()` podía matchear el relleno.
  await popover
    .locator('button:not([data-outside])', { hasText: new RegExp(`^${dayNumber}$`) })
    .first()
    .click();
}

// Fecha de nacimiento de un adulto (hoy - yearsAgo), eligiendo primero el
// año en el selector rápido del calendario y recién ahí el día — el campo
// ahora deshabilita cualquier fecha que no deje al usuario ser mayor de
// edad (DateField + disableAfter(latestAdultBirthDate()) en
// UsersListPage.tsx), así que no alcanza con clicar un día del mes actual
// como antes.
export async function pickAdultBirthDate(page: Page, fieldId: string, yearsAgo = 25) {
  await page.click(`#${fieldId}`);
  const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
  await popover.waitFor({ state: 'visible' });

  const targetYear = new Date().getFullYear() - yearsAgo;
  const yearTrigger = popover.locator('button[role="combobox"]').nth(1);
  await yearTrigger.click();
  await page.locator('[role="option"]', { hasText: new RegExp(`^${targetYear}$`) }).first().click();

  await popover.locator('button:not([data-outside])', { hasText: /^1$/ }).first().click();
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

// El menú lateral agrupa los módulos (Ventas, Finanzas, Configuración) y cada
// grupo arranca cerrado, salvo el que contiene la pantalla actual: se abre
// antes de buscar un ítem adentro (src/app/navigation/menuConfig.ts).
export async function openMenuGroup(page: Page, groupLabel: string) {
  const header = page.locator('[data-slot="sidebar"]').getByRole('button', { name: groupLabel, exact: true });
  if ((await header.getAttribute('aria-expanded')) === 'true') return;
  await header.click();
  await expect(header).toHaveAttribute('aria-expanded', 'true');
}

// Las notificaciones (sonner) aparecen arriba a la derecha, encima de los
// botones del encabezado ("Lista"/"Tablero", "Nuevo …"). Si el puntero pasa
// sobre una, sonner pausa su cierre y el clic queda bloqueado hasta que la
// prueba vence: se espera a que se vayan solas antes de tocar esos botones.
export async function waitForToastsToClear(page: Page) {
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// Cierre de caja: empresa desechable creada por API.
// ---------------------------------------------------------------------------

const E2E_API_URL = process.env.E2E_API_URL ?? 'http://localhost:4750/api';
const TEMPORARY_PASSWORD = '123456';
const READY_PASSWORD = 'Test1234';
const ADMIN_ROLE_ID = 2;
const GESTOR_ROLE_ID = 6;

export interface DisposableCashCompany {
  companyId: number;
  companyName: string;
  storeId: number;
  adminEmail: string;
  gestorEmail: string;
  password: string;
  bankAccountId: number;
  bankAccountName: string;
}

// Token del Super Administrador QA guardado por global.setup (storageState).
// NO se vuelve a loguear: cada login nuevo cierra la sesión anterior del
// mismo usuario y rompería las demás suites.
export function storedAuthToken(stateFile: string): string {
  const state = JSON.parse(readFileSync(stateFile, 'utf8')) as {
    origins: { localStorage: { name: string; value: string }[] }[];
  };
  const token = state.origins.flatMap((origin) => origin.localStorage).find((item) => item.name === 'auth_token')?.value;
  if (!token) throw new Error(`No hay auth_token en ${stateFile}`);
  return token;
}

export async function apiJson<T>(
  request: APIRequestContext,
  method: 'get' | 'post' | 'put' | 'patch',
  path: string,
  token: string | null,
  body?: object,
): Promise<{ status: number; body: T }> {
  const response = await request.fetch(`${E2E_API_URL}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    data: body,
  });
  return { status: response.status(), body: (await response.json()) as T };
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  code?: string;
  message?: string;
}

// Empresa "QA Cierre <stamp>" + tienda + admin sin tienda + gestor de la
// tienda + una cuenta de banco. Los cierres no se pueden borrar: cada corrida
// usa una empresa nueva (nunca "Acme Corp QA").
export async function createDisposableCashCompany(
  request: APIRequestContext,
  superToken: string,
): Promise<DisposableCashCompany> {
  const suffix = wordStamp().slice(0, 10);
  const companyName = `QA Cierre ${suffix}`;

  const company = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/company/create', superToken, {
    ruc: `207${Date.now().toString().slice(-8)}`,
    business_name: companyName,
  });
  // Las altas de empresa y tienda responden 201.
  expect(company.status, JSON.stringify(company.body)).toBe(201);
  const companyId = company.body.data.id;

  const store = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/business-unit/create', superToken, {
    company_id: companyId,
    business_code: `QC-${suffix.slice(0, 6)}`,
  });
  expect(store.status, JSON.stringify(store.body)).toBe(201);
  const storeId = store.body.data.id;

  const createUser = async (label: string, roleId: number, withStore: boolean): Promise<string> => {
    const email = `cierre.${label}.${wordStamp()}@acme.test`;
    const created = await apiJson<ApiEnvelope<unknown>>(request, 'post', '/user/create', superToken, {
      name: 'Cierre',
      paternal_lastname: label,
      document_type: 1,
      document_number: `${Date.now()}`.slice(-8),
      date_of_birth: '01/01/1990',
      email,
      status: true,
      gender: 4,
      company_id: companyId,
      ...(withStore ? { business_unit_id: storeId } : {}),
      roleIds: roleId,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    // Primer login con la contraseña temporal + cambio obligatorio.
    const first = await apiJson<ApiEnvelope<{ Jwt: string }>>(request, 'post', '/signin', null, {
      email,
      password: TEMPORARY_PASSWORD,
    });
    expect(first.status).toBe(200);
    const changed = await apiJson<ApiEnvelope<unknown>>(request, 'patch', '/user/change/password', first.body.data.Jwt, {
      oldPassword: TEMPORARY_PASSWORD,
      newPassword: READY_PASSWORD,
    });
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);
    return email;
  };

  const adminEmail = await createUser('Admin', ADMIN_ROLE_ID, false);
  const gestorEmail = await createUser('Gestor', GESTOR_ROLE_ID, true);

  // La cuenta la crea el admin (necesita sesión propia): se loguea por API y
  // esa sesión se reemplaza luego por el login de la UI.
  const adminSession = await apiJson<ApiEnvelope<{ Jwt: string }>>(request, 'post', '/signin', null, {
    email: adminEmail,
    password: READY_PASSWORD,
  });
  const bankAccountName = `BCP Cierre ${suffix.slice(0, 6)}`;
  const account = await apiJson<ApiEnvelope<{ id: number }>>(request, 'post', '/variable_general/create', adminSession.body.data.Jwt, {
    category: 'payment_account',
    title: 'Cuenta',
    prefix_id: 'bank',
    name: bankAccountName,
    ref1: '123',
    company_id: companyId,
  });
  expect(account.status, JSON.stringify(account.body)).toBe(200);

  return {
    companyId,
    companyName,
    storeId,
    adminEmail,
    gestorEmail,
    password: READY_PASSWORD,
    bankAccountId: account.body.data.id,
    bankAccountName,
  };
}

// Login por la UI (deja el token en localStorage de la página).
export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Ingresar")');
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Bienvenido,')).toBeVisible({ timeout: 10_000 });
}

export async function pageAuthToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  if (!token) throw new Error('La página no tiene auth_token');
  return token;
}

// Fecha 'YYYY-MM-DD' del día `day` del mes `monthsAgo` meses antes del actual
// (mes y año de Lima).
export function limaMonthDate(monthsAgo: number, day: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit' }).format(new Date());
  const [year = 0, month = 1] = parts.split('-').map(Number);
  const index = year * 12 + (month - 1) - monthsAgo;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const SPANISH_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// '2026-10-05' -> 'Octubre 2026' (nombre del mes como lo muestra la UI).
export function periodTitleOf(date: string): string {
  const [year, month = '1'] = date.split('-');
  const name = SPANISH_MONTHS[Number(month) - 1] ?? date;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}
