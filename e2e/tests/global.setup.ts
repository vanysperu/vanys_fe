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

setup('autenticar como Super Administrador', async ({ page }) => {
  await loginAs(page, SUPERADMIN.email, SUPERADMIN.password);
  await page.context().storageState({ path: SUPERADMIN_STATE });
});

setup('autenticar como Administrador de empresa (Acme Corp)', async ({ page }) => {
  await loginAs(page, COMPANY_ADMIN.email, COMPANY_ADMIN.password);
  await page.context().storageState({ path: ADMIN_STATE });
});

setup('autenticar como Gestor de empresa (Acme Corp)', async ({ page }) => {
  await loginAs(page, GESTOR.email, GESTOR.password);
  await page.context().storageState({ path: GESTOR_STATE });
});
