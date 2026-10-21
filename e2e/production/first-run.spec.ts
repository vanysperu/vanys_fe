import { expect, test, type Page } from '@playwright/test';

import { chooseSearchableSelect, chooseSelect, chooseSelectExact, openMenuGroup, stamp, wordStamp } from '../helpers';

// "Primer día" en producción, de punta a punta y con clics reales: lo que
// hace una persona apenas termina de publicar el sistema. Corre contra el
// paquete de producción recién instalado (ver playwright.production.config.ts).

const SUPERADMIN_EMAIL = process.env.PROD_ADMIN_EMAIL ?? '';
const SUPERADMIN_TEMP_PASSWORD = process.env.PROD_ADMIN_PASSWORD ?? '';
const SUPERADMIN_NEW_PASSWORD = 'Grulla-Prod-2026!';

// Contraseña temporal fija con la que nace todo usuario creado desde el
// panel (DEFAULT_TEMPORARY_PASSWORD del backend).
const NEW_USER_TEMP_PASSWORD = '123456';
const COMPANY_ADMIN_NEW_PASSWORD = 'Admin-Empresa-2026!';

// PNG real de 1x1 — pasa la validación de firma del backend.
const LOGO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Ingresar")');
}

// Un usuario con contraseña temporal es llevado a /change-password apenas
// entra, y no puede usar nada más hasta cambiarla.
async function changeTemporaryPassword(page: Page, temporary: string, definitive: string) {
  await expect(page).toHaveURL(/\/change-password$/, { timeout: 15_000 });
  await page.fill('#oldPassword', temporary);
  await page.fill('#newPassword', definitive);
  await page.click('button:has-text("Cambiar contraseña")');
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

test('primer día en producción: plataforma, empresa, logo, cotización con PDF, pago y caja', async ({ page }) => {
  test.skip(!SUPERADMIN_EMAIL || !SUPERADMIN_TEMP_PASSWORD, 'Falta PROD_ADMIN_EMAIL / PROD_ADMIN_PASSWORD');

  const suffix = stamp();
  const businessName = `Empresa Produccion ${wordStamp()}`;
  const ruc = `20${suffix.padStart(9, '0')}`.slice(0, 11);
  const storeCode = `TIENDA-${suffix}`;
  const adminFirstName = `Admin${wordStamp()}`;
  const adminEmail = `admin.${suffix}@empresa-prod.test`;

  await test.step('el Super Administrador entra con su contraseña temporal y está obligado a cambiarla', async () => {
    await login(page, SUPERADMIN_EMAIL, SUPERADMIN_TEMP_PASSWORD);
    await changeTemporaryPassword(page, SUPERADMIN_TEMP_PASSWORD, SUPERADMIN_NEW_PASSWORD);
    // "Empresas" vive en el grupo "Configuración" del menú (cerrado al entrar).
    await openMenuGroup(page, 'Configuración');
    await expect(
      page.locator('[data-slot="sidebar"]').getByRole('link', { name: 'Empresas', exact: true }),
    ).toBeVisible();
  });

  await test.step('crea la empresa y su tienda', async () => {
    await page.goto('/configuracion/apariencia-empresas');
    await page.click('button:has-text("Nueva empresa")');
    await page.fill('#ruc', ruc);
    await page.fill('#business_name', businessName);
    await page.click('div[role="dialog"] button:has-text("Crear empresa")');
    await expect(page.locator('text=Empresa creada correctamente')).toBeVisible();

    await page.goto('/configuracion/tiendas');
    await page.click('button:has-text("Nueva tienda")');
    await page.fill('#business_code', storeCode);
    await chooseSelect(page, 'Empresa', businessName);
    await page.click('div[role="dialog"] button:has-text("Crear tienda")');
    await expect(page.locator('text=Tienda creada correctamente')).toBeVisible();
  });

  await test.step('crea el primer Administrador de la empresa', async () => {
    await page.goto('/seguridad/usuarios');
    await page.click('button:has-text("Nuevo usuario")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    await page.fill('#name', adminFirstName);
    await page.fill('#paternal_lastname', 'Empresa');
    await page.fill('#email', adminEmail);
    await page.click('#date_of_birth');
    const calendar = page.locator('[data-slot="popover-content"][data-state="open"]');
    await calendar.waitFor({ state: 'visible' });
    await calendar.locator('button', { hasText: /^1$/ }).first().click();
    await chooseSelect(page, 'Tipo de documento', 'DNI');
    await page.fill('#document_number', suffix.padStart(8, '0').slice(0, 8));
    await chooseSelect(page, 'Género', 'Masculino');
    await chooseSelect(page, 'Empresa', businessName);
    await chooseSelect(page, 'Tienda', storeCode);
    await chooseSelectExact(page, 'Rol', 'Administrador');
    await page.click('div[role="dialog"] button:has-text("Crear usuario")');
    await expect(page.locator('text=Usuario creado')).toBeVisible();
  });

  await test.step('el Administrador entra y cambia su contraseña temporal', async () => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, adminEmail, NEW_USER_TEMP_PASSWORD);
    await changeTemporaryPassword(page, NEW_USER_TEMP_PASSWORD, COMPANY_ADMIN_NEW_PASSWORD);
  });

  await test.step('sube el logo de la empresa y se ve (guardado en la base, no en disco)', async () => {
    await page.goto('/configuracion/documentos');
    await page.locator('input[type="file"][accept="image/png,image/jpeg,image/webp"]').first().setInputFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: LOGO_PNG,
    });
    await expect(page.locator('text=Logo cargado')).toBeVisible();
    await page.click('button:has-text("Guardar")');
    await expect(page.locator('text=Documentos actualizados')).toBeVisible();

    await page.reload();
    const logo = page.locator('img[alt="Logo"]');
    await expect(logo).toHaveAttribute('src', /\/uploads\/company-assets\//);
    await expect.poll(() => logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  const clientName = `Cliente Produccion ${wordStamp()}`;

  await test.step('arma una cotización completa con cliente, producto y técnica nuevos', async () => {
    await page.goto('/cotizaciones');
    await page.click('button:has-text("Nueva cotización")');
    await page.click('button[title="Nuevo cliente"]');
    await page.fill('#quick-client-name', clientName);
    await page.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(page.locator('text=Cliente creado')).toBeVisible();

    await page.click('button[title="Nuevo producto"]');
    await page.fill('#quick-product-name', `Polo Produccion ${suffix}`);
    await page.fill('#quick-product-price-unit', '19.99');
    // Estos productos se cotizan con técnica: hay que marcarlos.
    await page.click('#quick-product-requires-customization');
    await page.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(page.locator('text=Producto creado')).toBeVisible();

    await page.click('button[title="Nueva técnica"]');
    await page.fill('#quick-technique-name', `Bordado Produccion ${suffix}`);
    await page.fill('#quick-technique-price-unit', '5');
    await page.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(page.locator('text=Técnica creada')).toBeVisible();

    await page.fill('div[role="dialog"] input[type="number"][min="1"]', '25');
    await page.click('div[role="dialog"] button:has-text("Crear cotización")');
    await expect(page.locator('text=Cotización creada correctamente')).toBeVisible();
  });

  // El detalle se abre una sola vez: PDF y pago se hacen desde el mismo
  // diálogo. Los botones se buscan DENTRO del diálogo — la fila de la tabla,
  // que queda detrás, tiene sus propios botones con el mismo título.
  const detail = page.getByRole('dialog', { name: /^Cotización #/ });

  await test.step('genera el PDF: vista previa y descarga (con fuente y logo embebidos)', async () => {
    await page.getByRole('button', { name: 'Lista', exact: true }).click();
    await page.click(`span:has-text("${clientName}")`);
    await expect(detail).toBeVisible();

    await detail.locator('button[title="Vista previa del PDF"]').click();
    const preview = page.getByRole('dialog', { name: /^Vista previa/ });
    await expect(preview.locator('iframe[title="Vista previa del PDF"]')).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await preview.getByRole('button', { name: 'Descargar' }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const pdf = Buffer.concat(chunks);

    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    const content = pdf.toString('latin1');
    expect(content).toMatch(/Roboto/);
    expect(content).toMatch(/\/Subtype\s*\/Image/);

    // Cierra solo la vista previa; el detalle sigue abierto.
    await page.keyboard.press('Escape');
    await expect(preview).toBeHidden();
  });

  await test.step('registra un pago en la cotización', async () => {
    await detail.getByRole('tab', { name: 'Pagos' }).click();
    await detail.getByRole('button', { name: 'Registrar pago' }).click();
    await page.fill('#payment-amount', '100');
    await page.click('#payment-method');
    await page.locator('[role="option"]', { hasText: 'Efectivo' }).first().click();
    await detail.getByRole('button', { name: 'Guardar pago' }).click();
    await expect(page.locator('text=Pago registrado')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(detail).toBeHidden();
  });

  await test.step('registra un movimiento de caja', async () => {
    await page.goto('/caja');
    await page.click('button:has-text("Nuevo movimiento")');
    const dialog = page.locator('div[role="dialog"]');
    await dialog.locator('div.space-y-2', { hasText: 'Tipo' }).locator('button[role="combobox"]').click();
    await page.locator('[role="option"]', { hasText: 'Ingreso' }).click();
    await chooseSearchableSelect(page, 'Categoría', 'Otro ingreso');
    await page.fill('#cash-movement-amount', '250.00');
    await page.click('#cash-movement-date');
    const calendar = page.locator('[data-slot="popover-content"][data-state="open"]');
    await calendar.waitFor({ state: 'visible' });
    await calendar.locator('button', { hasText: /^1$/ }).first().click();
    await page.fill('#cash-movement-description', `Caja produccion ${suffix}`);
    await page.click('div[role="dialog"] button:has-text("Registrar movimiento")');
    await expect(page.locator('text=Movimiento registrado correctamente')).toBeVisible();
  });

  await test.step('abrir directamente una ruta interna funciona (no da 404 al recargar)', async () => {
    await page.goto('/cotizaciones');
    await expect(page.locator('h1', { hasText: 'Cotizaciones' })).toBeVisible();
    await page.reload();
    await expect(page.locator('h1', { hasText: 'Cotizaciones' })).toBeVisible();
  });
});
