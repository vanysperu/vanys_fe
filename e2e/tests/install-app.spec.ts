import { devices, expect, test } from '@playwright/test';

// App instalable en el iPhone (manifest + aviso "Instala Vanys en tu iPhone",
// ver src/app/layout/InstallAppPrompt.tsx). Corre en el login, sin sesión:
// no inicia sesión con ningún usuario, así que no cierra la de nadie.
test.use({ storageState: { cookies: [], origins: [] } });

// Solo el user-agent/pantalla del iPhone, sobre el mismo Chromium de la suite
// (devices['iPhone 15'] trae defaultBrowserType 'webkit', que no se instala).
const { defaultBrowserType: _webkit, ...iphone } = devices['iPhone 15'];
const { defaultBrowserType: _chromium, ...android } = devices['Pixel 7'];

// Simula el "beforeinstallprompt" de Chrome (no se puede forzar el real en
// una prueba). Su prompt() marca el body para poder comprobar que se llamó.
// Se pasa a page.evaluate, así que corre dentro del navegador. choice es
// "accepted" o "dismissed" (string: page.evaluate ensancha el literal).
function fireInstallPromptEvent(choice: string): void {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, {
    prompt: async () => {
      document.body.dataset.installPrompted = 'yes';
    },
    userChoice: Promise.resolve({ outcome: choice, platform: 'web' }),
  });
  window.dispatchEvent(event);
}

test.describe('App instalable', () => {
  test('el index enlaza el manifest con modo pantalla completa e íconos', async ({ page, request }) => {
    await page.goto('/login');
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Vanys');

    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest).toMatchObject({ name: 'Vanys', display: 'standalone', start_url: '/' });
    for (const icon of manifest.icons as { src: string }[]) {
      const response = await request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
    }
  });

  test('en escritorio no aparece el aviso de instalación', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1', { hasText: 'Bienvenido de vuelta' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Instalar la app' })).toHaveCount(0);

    // Ni siquiera cuando Chrome de escritorio ofrece instalar: en la PC ya
    // está el ícono de la barra de direcciones.
    await page.evaluate(fireInstallPromptEvent, 'accepted');
    await page.waitForTimeout(300);
    await expect(page.getByRole('region', { name: 'Instalar la app' })).toHaveCount(0);
  });

  test.describe('en un Android', () => {
    test.use(android);

    test('sin la instalación de un toque, el aviso abre la guía de Chrome', async ({ page }) => {
      await page.goto('/login');
      const banner = page.getByRole('region', { name: 'Instalar la app' });
      const install = banner.getByRole('button', { name: /Instala Vanys en tu celular/ });
      await expect(install).toContainText('Toca aquí para ver cómo');

      await install.click();
      const guide = page.getByRole('dialog', { name: 'Instalar Vanys en tu celular' });
      await expect(guide.locator('ol > li')).toHaveCount(3);
      await expect(guide).toContainText('Instalar app');
      await guide.getByRole('button', { name: 'Entendido' }).click();
      await expect(guide).toBeHidden();
    });

    test('con la instalación de un toque, instala sin guía y el aviso se va', async ({ page }) => {
      await page.goto('/login');
      const banner = page.getByRole('region', { name: 'Instalar la app' });
      await expect(banner).toBeVisible();
      await page.evaluate(fireInstallPromptEvent, 'accepted');

      const install = banner.getByRole('button', { name: /Instala Vanys en tu celular/ });
      await expect(install).toContainText('Toca aquí para instalarla');
      await install.click();

      await expect(page.locator('body')).toHaveAttribute('data-install-prompted', 'yes');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(banner).toHaveCount(0);
      await page.reload();
      await expect(page.locator('h1', { hasText: 'Bienvenido de vuelta' })).toBeVisible();
      await expect(banner).toHaveCount(0);
    });

    test('si cancela el diálogo de instalación, el aviso vuelve a la guía', async ({ page }) => {
      await page.goto('/login');
      const banner = page.getByRole('region', { name: 'Instalar la app' });
      await expect(banner).toBeVisible();
      await page.evaluate(fireInstallPromptEvent, 'dismissed');

      const install = banner.getByRole('button', { name: /Instala Vanys en tu celular/ });
      await install.click();
      await expect(page.locator('body')).toHaveAttribute('data-install-prompted', 'yes');
      await expect(install).toContainText('Toca aquí para ver cómo');
    });
  });

  test.describe('en un iPhone', () => {
    test.use(iphone);

    test('muestra el aviso, abre la guía y "Ahora no" lo oculta para siempre', async ({ page }) => {
      await page.goto('/login');
      const banner = page.getByRole('region', { name: 'Instalar la app' });
      await expect(banner).toBeVisible();

      // No tapa el botón principal del login.
      const bannerBox = await banner.boundingBox();
      const loginBox = await page.getByRole('button', { name: 'Ingresar' }).boundingBox();
      expect(loginBox!.y + loginBox!.height).toBeLessThanOrEqual(bannerBox!.y);

      await banner.getByRole('button', { name: /Instala Vanys en tu iPhone/ }).click();
      const guide = page.getByRole('dialog', { name: 'Instalar Vanys en tu iPhone' });
      await expect(guide).toBeVisible();
      await expect(guide.locator('ol > li')).toHaveCount(3);
      await expect(guide).toContainText('Agregar a pantalla de inicio');
      await guide.getByRole('button', { name: 'Entendido' }).click();
      await expect(guide).toBeHidden();

      await banner.getByRole('button', { name: 'Ahora no' }).click();
      await expect(banner).toHaveCount(0);
      await page.reload();
      await expect(page.locator('h1', { hasText: 'Bienvenido de vuelta' })).toBeVisible();
      await expect(banner).toHaveCount(0);
    });

    test('abierta desde la pantalla de inicio no muestra el aviso', async ({ page }) => {
      // navigator.standalone = true es lo que expone Safari cuando la app se
      // abre desde el ícono de la pantalla de inicio.
      await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
      await page.goto('/login');
      await expect(page.locator('h1', { hasText: 'Bienvenido de vuelta' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Instalar la app' })).toHaveCount(0);
    });
  });
});
