import { expect, test as setup } from '@playwright/test';

import { ADMIN_STATE, COMPANY_ADMIN, GESTOR, GESTOR_STATE, SUPERADMIN, SUPERADMIN_STATE } from '../auth';

async function loginAs(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Ingresar")');
  // El toast de bienvenida + la redirección a "/" confirman login real (no
  // solo que el form se envió) — evita guardar un storageState de una
  // sesión que en realidad falló por credenciales/CORS.
  await expect(page).toHaveURL('/');
  await expect(page.locator('text=Bienvenido,')).toBeVisible({ timeout: 10_000 });
}

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4750/api';

// Recordatorios que corridas anteriores dejaron vencidos (o programados para
// más tarde) en las cuentas QA: sus avisos (toasts) aparecen en TODAS las
// pantallas y tapan encabezados y botones, rompiendo snapshots y clics. Se
// marcan como vistos los vencidos y se cancelan los programados. Solo toca
// recordatorios de las cuentas QA de esta suite.
async function clearReminders(page: import('@playwright/test').Page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const headers = { Authorization: `Bearer ${token}` };

  const due = await page.request.get(`${API_URL}/reminder/due`, { headers });
  const dueBody = (await due.json()) as { data?: { data?: { id: number }[] } };
  for (const reminder of dueBody.data?.data ?? []) {
    await page.request.put(`${API_URL}/reminder/read/${reminder.id}`, { headers });
  }

  const upcoming = await page.request.get(`${API_URL}/reminder/list?box=sent&status=upcoming&limit=100`, { headers });
  const upcomingBody = (await upcoming.json()) as { data?: { data?: { id: number }[] } };
  for (const reminder of upcomingBody.data?.data ?? []) {
    await page.request.put(`${API_URL}/reminder/disable/${reminder.id}`, { headers });
  }
}

setup('autenticar como Super Administrador', async ({ page }) => {
  await loginAs(page, SUPERADMIN.email, SUPERADMIN.password);
  await page.context().storageState({ path: SUPERADMIN_STATE });
});

setup('autenticar como Administrador de empresa (Acme Corp)', async ({ page }) => {
  await loginAs(page, COMPANY_ADMIN.email, COMPANY_ADMIN.password);
  await clearReminders(page);
  await page.context().storageState({ path: ADMIN_STATE });
});

setup('autenticar como Gestor de empresa (Acme Corp)', async ({ page }) => {
  await loginAs(page, GESTOR.email, GESTOR.password);
  await clearReminders(page);
  await page.context().storageState({ path: GESTOR_STATE });
});
