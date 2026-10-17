import { expect, test } from '@playwright/test';

import { LOGIN_FLOW_USER } from '../auth';

// Sin storageState (test.use no se aplica acá) — esta suite necesita
// arrancar SIN sesión, es justo lo que valida.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test('se ve bien y permite iniciar sesión con credenciales válidas', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1', { hasText: 'Bienvenido de vuelta' })).toBeVisible();
    await page.waitForTimeout(500); // deja terminar la animación de entrada (framer-motion)
    await expect(page).toHaveScreenshot('login-page.png');

    await page.fill('#email', LOGIN_FLOW_USER.email);
    await page.fill('#password', LOGIN_FLOW_USER.password);
    await page.click('button:has-text("Ingresar")');
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Bienvenido,')).toBeVisible();
  });

  test('credenciales inválidas muestran un mensaje de error claro, sin navegar', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', LOGIN_FLOW_USER.email);
    await page.fill('#password', 'contraseña-incorrecta');
    await page.click('button:has-text("Ingresar")');

    await expect(page.locator('.text-destructive')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('campos vacíos muestran validación del formulario, sin llamar a la API', async ({ page }) => {
    await page.goto('/login');
    await page.click('button:has-text("Ingresar")');
    await expect(page.locator('text=La contraseña es obligatoria')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});
