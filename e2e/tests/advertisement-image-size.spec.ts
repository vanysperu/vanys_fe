import { expect, test } from '@playwright/test';

import { ADMIN_STATE } from '../auth';

test.use({ storageState: ADMIN_STATE });

// PNG válido de 1x1 rellenado hasta el peso pedido: el navegador solo mira el
// tipo y el peso; el servidor revisa además la firma real del archivo.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const pngOfSize = (megabytes: number): Buffer => Buffer.concat([PNG_1X1, Buffer.alloc(Math.round(megabytes * 1024 * 1024) - PNG_1X1.length)]);

// Pedido del usuario (17-nov-2026): la imagen de un anuncio sube de 2 a 3 MB.
// Las demás imágenes (productos, logo, QR) siguen en 2 MB.
test.describe('Anuncios: peso máximo de la imagen', () => {
  test('el formulario dice máx. 3 MB, acepta 2.5 MB y rechaza 3.5 MB', async ({ page }) => {
    await page.goto('/anuncios');
    await page.getByRole('button', { name: /Nuevo anuncio/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo anuncio' });
    await expect(dialog.getByText('PNG, JPG o WEBP · máx. 3 MB')).toBeVisible();

    const input = dialog.locator('input[type="file"]');

    // 3.5 MB: se avisa al instante, sin subir nada.
    await input.setInputFiles({ name: 'muy-pesada.png', mimeType: 'image/png', buffer: pngOfSize(3.5) });
    await expect(page.getByText('La imagen pesa 3.5 MB, el máximo es 3 MB')).toBeVisible();
    await expect(dialog.getByTestId('advertisement-image-preview')).toHaveCount(0);

    // 2.5 MB: antes se rechazaba (tope de 2 MB); ahora se sube y se ve la vista previa.
    await input.setInputFiles({ name: 'banner.png', mimeType: 'image/png', buffer: pngOfSize(2.5) });
    await expect(dialog.getByTestId('advertisement-image-preview')).toBeVisible({ timeout: 15_000 });
  });

  test('el logo de los documentos sigue con máx. 2 MB (mismo validador, tope de siempre)', async ({ page }) => {
    await page.goto('/configuracion/documentos');
    await expect(page.getByText('PNG, JPG o WEBP · máx. 2 MB').first()).toBeVisible();
    await expect(page.getByText('máx. 3 MB')).toHaveCount(0);
  });
});
