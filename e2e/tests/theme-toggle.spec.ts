import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';

test.use({ storageState: ADMIN_STATE });

// Pedido explícito del usuario: el botón de día/noche tenía tres pasos
// (claro, oscuro y "sistema"). Ahora alterna solo entre día y noche, y la
// elección se recuerda al recargar.
test('el botón de día/noche alterna solo entre dos modos y se recuerda', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const toNight = page.getByRole('button', { name: 'Cambiar a modo noche' });
  const toDay = page.getByRole('button', { name: 'Cambiar a modo día' });

  // Sin preferencia guardada sigue al sistema (Playwright emula modo claro).
  await expect(html).not.toHaveClass(/\bdark\b/);

  await toNight.click();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(toDay).toBeVisible();

  await toDay.click();
  await expect(html).not.toHaveClass(/\bdark\b/);
  // Sin tercer paso: después de "día" vuelve a ofrecer "noche".
  await expect(toNight).toBeVisible();

  await toNight.click();
  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);
  await expect(toDay).toBeVisible();
});
