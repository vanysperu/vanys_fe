import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { apiJson, storedAuthToken, wordStamp } from '../helpers';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

const GESTOR_ROLE_ID = 6;

// Enlaces para crear o recuperar la contraseña (Sprint 2, pedido explícito del
// usuario: "yo no quiero códigos, quiero que llegue link para crear contraseña
// o link para recuperarla"). Sin sesión guardada: son pantallas públicas.
test.describe('Enlaces de contraseña', () => {
  test('"¿Olvidaste tu contraseña?" responde lo mismo exista o no el correo', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena$/);
    await expect(page.getByRole('heading', { name: 'Recupera tu contraseña' })).toBeVisible();

    await page.fill('#email', `nadie.${wordStamp()}@acme.test`);
    await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
    await expect(page.getByRole('status')).toContainText('Si el correo está registrado');

    await page.getByRole('link', { name: 'Volver a iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('un usuario nuevo crea su contraseña con el enlace de invitación y entra', async ({ page, request }) => {
    // El admin QA crea el usuario por API (su sesión guardada, sin volver a loguearse).
    const adminToken = storedAuthToken(ADMIN_STATE);
    const access = await apiJson<ApiEnvelope<{ companyId: number }>>(request, 'get', '/access/me', adminToken);
    const stores = await apiJson<ApiEnvelope<{ data: { id: number }[] }>>(request, 'get', '/business-unit/list?page=1&limit=1', adminToken);
    const email = `invitado.e2e.${wordStamp()}@acme.test`;
    const created = await apiJson<ApiEnvelope<{ invitation: { url: string } }>>(request, 'post', '/user/create', adminToken, {
      name: 'Invitado',
      paternal_lastname: 'Prueba',
      document_type: 1,
      document_number: `${Date.now()}`.slice(-8),
      date_of_birth: '01/01/1990',
      email,
      status: true,
      gender: 4,
      company_id: access.body.data.companyId,
      business_unit_id: stores.body.data.data[0]?.id,
      roleIds: GESTOR_ROLE_ID,
    });
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    const invitation = new URL(created.body.data.invitation.url);
    const linkPath = invitation.pathname + invitation.hash;

    await page.goto(linkPath);
    await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible();
    await expect(page.getByText('Hola, Invitado Prueba')).toBeVisible();

    // Las dos contraseñas tienen que coincidir.
    await page.fill('#password', 'Invitado2026!');
    await page.fill('#confirmation', 'Otra2026!');
    await page.getByRole('button', { name: 'Crear mi contraseña' }).click();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();

    await page.fill('#confirmation', 'Invitado2026!');
    await page.getByRole('button', { name: 'Crear mi contraseña' }).click();
    await expect(page.getByRole('heading', { name: '¡Listo!' })).toBeVisible({ timeout: 10_000 });

    // Un enlace sirve una sola vez. (Antes se sale de la página: ir a la misma
    // URL cambiando solo el "#" no recarga.)
    await page.goto('/login');
    await page.goto(linkPath);
    await expect(page.getByRole('alert')).toContainText('Este enlace ya se usó');

    // Entra con la contraseña nueva.
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', 'Invitado2026!');
    await page.click('button:has-text("Ingresar")');
    await expect(page).toHaveURL('/', { timeout: 15_000 });
  });

  test('un enlace inválido muestra el aviso y ofrece pedir uno nuevo', async ({ page }) => {
    await page.goto('/restablecer-contrasena#token=enlace-que-no-existe-en-la-base-de-datos-xx');
    await expect(page.getByRole('alert')).toContainText('Este enlace no es válido');
    await page.getByRole('link', { name: 'Pedir un enlace nuevo' }).click();
    await expect(page).toHaveURL(/\/recuperar-contrasena$/);
  });
});
