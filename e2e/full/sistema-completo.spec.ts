import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import {
  businessTodayDay,
  chooseSearchableSelect,
  chooseSelect,
  chooseSelectExact,
  chooseSelectNear,
  loginViaUi,
  pickAdultBirthDate,
  pickDate,
  stamp,
  waitForToastsToClear,
  wordStamp,
} from '../helpers';

// Prueba E2E del SISTEMA COMPLETO, de inicio a fin (pedido del usuario, 21-nov):
// arranca en una base de fábrica (solo el Super Administrador) y hace por la
// interfaz lo mismo que un cliente nuevo, en orden:
//   Super Admin: empresa → tienda → admin y gestor (con su enlace de invitación)
//   Admin: cuenta bancaria con CCI → saldo inicial de Caja → cliente, producto,
//          técnica → cotización con descuento → PDF y enlace del cliente →
//          aceptada con adelanto → diseño → estados → orden de compra
//   Gestor: ve la cotización de su tienda, registra la compra, no puede cambiar
//           el estado a mano ni ver Estadísticas
//   Admin: factura de la compra → PDF de la orden → cambio de estado → entrega →
//          saldo → finalizada → Caja (movimiento, IGV, Excel) → préstamo →
//          estadísticas → todas las vistas cargan sin errores.
//
// Corre con su propio backend y frontend sobre `grulla_e2e_local` (se resetea
// en cada corrida): `npm run test:e2e:full` (ver playwright.full.config.ts).

const SUPERADMIN = { email: 'admin@acme.test', password: 'Test1234' };
const PASSWORD = 'Test1234';

const suffix = wordStamp().slice(0, 6);
const run = {
  companyName: `Textiles Andinos ${suffix}`,
  ruc: `20${stamp().padStart(9, '0').slice(-9)}`,
  storeCode: `LIMA-${suffix.slice(0, 4).toUpperCase()}`,
  adminEmail: `admin.${suffix}@e2e.test`,
  gestorEmail: `gestor.${suffix}@e2e.test`,
  bankAccountName: `BCP Soles ${suffix}`,
  bankAccountNumber: '191-12345678-0-99',
  cci: '002-191-001234567899-55',
  clientName: `Cliente Recorrido ${suffix}`,
  productName: `Polo Algodon ${suffix}`,
  techniqueName: `Bordado ${suffix}`,
  borrower: `Rosa Quispe ${suffix}`,
};

// Montos esperados (sin IGV en el precio; la cotización suma 18 %):
// producto 20 + técnica 5 = 25 c/u, 10 % de descuento → 22.50 c/u × 10 = 225.00
// + IGV 40.50 = 265.50. Adelanto 100 + saldo 165.50.
const TOTAL = '265.50';
const ADVANCE = '100';
const BALANCE = '165.50';
const PURCHASE_AMOUNT = '118';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

test.describe.configure({ mode: 'serial' });

let superAdminContext: BrowserContext;
let adminContext: BrowserContext;
let gestorContext: BrowserContext;
let superAdmin: Page;
let admin: Page;
let gestor: Page;
let adminInviteUrl = '';
let gestorInviteUrl = '';
let quotationId = 0;

// Diagnóstico: si una pestaña se cae o la app tira un error, queda en la
// salida de la prueba con el nombre del usuario (una pestaña caída se ve en
// blanco en la captura y no dice por qué).
const watchPage = (label: string, page: Page) => {
  page.on('crash', () => console.log(`[${label}] la pestaña se cayó (crash) en ${page.url()}`));
  page.on('pageerror', (error) => console.log(`[${label}] error de la página en ${page.url()}: ${error.message}`));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    // Las peticiones que corta una navegación (ERR_ABORTED) son normales.
    if (failure.includes('ERR_ABORTED')) return;
    console.log(`[${label}] falló ${request.method()} ${request.url()}: ${failure}`);
  });
};

const newPage = async (browser: Browser, label = 'visitante'): Promise<[BrowserContext, Page]> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  watchPage(label, page);
  return [context, page];
};

// Detalle de la cotización del recorrido (el título es "Cotización #<id>").
const quotationDetail = (page: Page) => page.getByRole('dialog', { name: /^Cotización #\d+$/ });

const openQuotation = async (page: Page) => {
  await page.goto(`/cotizaciones?abrir=${quotationId}`);
  const detail = quotationDetail(page);
  await expect(detail).toBeVisible();
  await expect(detail.getByText(run.clientName).first()).toBeVisible();
  return detail;
};

// Crea un usuario de la empresa como Super Admin y devuelve su enlace de invitación.
const createCompanyUser = async (page: Page, user: { name: string; lastname: string; email: string; role: string; dni: string }) => {
  await page.goto('/seguridad/usuarios');
  await waitForToastsToClear(page);
  await page.click('button:has-text("Nuevo usuario")');
  await expect(page.locator('div[role="dialog"]')).toBeVisible();
  await page.fill('#name', user.name);
  await page.fill('#paternal_lastname', user.lastname);
  await page.fill('#email', user.email);
  await pickAdultBirthDate(page, 'date_of_birth');
  await chooseSelect(page, 'Tipo de documento', 'DNI');
  await page.fill('#document_number', user.dni);
  await chooseSelect(page, 'Género', 'Femenino');
  await page.fill('#phone_number', '987654321');
  await chooseSelect(page, 'Empresa', run.companyName);
  await chooseSelect(page, 'Tienda', run.storeCode);
  await chooseSelectExact(page, 'Rol', user.role);
  await page.click('div[role="dialog"] button:has-text("Crear usuario")');
  await expect(page.getByText('Usuario creado')).toBeVisible();
  const invitation = page.getByRole('dialog', { name: 'Invitación lista' });
  const url = await invitation.getByRole('textbox', { name: 'Enlace de contraseña' }).inputValue();
  expect(url).toContain('#token=');
  await invitation.getByRole('button', { name: 'Listo' }).click();
  await expect(invitation).toBeHidden();
  return url;
};

// El usuario abre su enlace, crea su contraseña y entra.
const activateAndLogin = async (page: Page, inviteUrl: string, email: string) => {
  const link = new URL(inviteUrl);
  await page.goto(link.pathname + link.hash);
  await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible();
  await page.fill('#password', PASSWORD);
  await page.fill('#confirmation', PASSWORD);
  await page.getByRole('button', { name: 'Crear mi contraseña' }).click();
  await expect(page.getByRole('heading', { name: '¡Listo!' })).toBeVisible();
  await loginViaUi(page, email, PASSWORD);
};

const advanceStatus = async (page: Page, label: string) => {
  const detail = quotationDetail(page);
  await waitForToastsToClear(page);
  await detail.getByRole('button', { name: label, exact: true }).click();
  await expect(page.getByText(`Cotización marcada como "${label}"`)).toBeVisible();
};

test.beforeAll(async ({ browser }) => {
  [superAdminContext, superAdmin] = await newPage(browser, 'super admin');
  [adminContext, admin] = await newPage(browser, 'admin');
  [gestorContext, gestor] = await newPage(browser, 'gestor');
});

test.afterAll(async () => {
  await Promise.all([superAdminContext?.close(), adminContext?.close(), gestorContext?.close()]);
});

test.describe('Sistema completo de inicio a fin', () => {
  test('01. el Super Admin de fábrica entra y crea la empresa', async () => {
    await loginViaUi(superAdmin, SUPERADMIN.email, SUPERADMIN.password);
    await superAdmin.goto('/configuracion/apariencia-empresas');
    await waitForToastsToClear(superAdmin);
    await superAdmin.click('button:has-text("Nueva empresa")');
    await superAdmin.fill('#ruc', run.ruc);
    await superAdmin.fill('#business_name', run.companyName);
    await superAdmin.click('div[role="dialog"] button:has-text("Crear empresa")');
    await expect(superAdmin.getByText('Empresa creada correctamente')).toBeVisible();
    await expect(superAdmin.locator('tr', { hasText: run.companyName })).toBeVisible();
  });

  test('02. crea la tienda de la empresa', async () => {
    await superAdmin.goto('/configuracion/tiendas');
    await waitForToastsToClear(superAdmin);
    await superAdmin.click('button:has-text("Nueva tienda")');
    await superAdmin.fill('#business_code', run.storeCode);
    await chooseSelect(superAdmin, 'Empresa', run.companyName);
    await superAdmin.click('div[role="dialog"] button:has-text("Crear tienda")');
    await expect(superAdmin.getByText('Tienda creada correctamente')).toBeVisible();
    await expect(superAdmin.locator('tr', { hasText: run.storeCode })).toBeVisible();
  });

  test('03. crea al administrador y al gestor de la tienda con su invitación', async () => {
    const dni = stamp().slice(-7);
    adminInviteUrl = await createCompanyUser(superAdmin, {
      name: `Ana${suffix}`,
      lastname: 'Empresa',
      email: run.adminEmail,
      role: 'Administrador',
      dni: `4${dni}`,
    });
    gestorInviteUrl = await createCompanyUser(superAdmin, {
      name: `Gina${suffix}`,
      lastname: 'Gestora',
      email: run.gestorEmail,
      role: 'Gestor',
      dni: `7${dni}`,
    });
  });

  test('04. cada uno activa su cuenta con el enlace y entra', async ({ browser }) => {
    await activateAndLogin(admin, adminInviteUrl, run.adminEmail);
    await activateAndLogin(gestor, gestorInviteUrl, run.gestorEmail);
    // Un enlace de invitación sirve una sola vez.
    const [reuseContext, reusePage] = await newPage(browser);
    const link = new URL(adminInviteUrl);
    await reusePage.goto(link.pathname + link.hash);
    await expect(reusePage.getByText('Este enlace ya se usó')).toBeVisible();
    await reuseContext.close();
    // El Super Admin ya no se usa: se cierra su pestaña para no gastar memoria
    // (en un equipo con poca RAM, Chromium con muchas pestañas se congelaba).
    await superAdminContext.close();
  });

  test('05. el admin carga su cuenta bancaria con número y CCI', async () => {
    await admin.goto('/configuracion/documentos');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Agregar cuenta' }).click();
    const form = admin.getByTestId('payment-account-form');
    await form.getByRole('combobox').first().click();
    await admin.getByRole('option', { name: 'Cuenta bancaria' }).click();
    await form.locator('#account-name-new').fill(run.bankAccountName);
    await form.locator('#account-ref1-new').fill(run.bankAccountNumber);
    await form.locator('#account-ref3-new').fill(run.cci);
    await form.getByRole('button', { name: 'Guardar' }).click();
    await expect(admin.getByText('Cuenta agregada')).toBeVisible();
    // El CCI se guarda solo con sus 20 dígitos.
    await expect(admin.getByText(`CCI ${run.cci.replace(/-/g, '')}`)).toBeVisible();
  });

  test('06. configura el saldo inicial de Caja', async () => {
    await admin.goto('/caja/cierres');
    await waitForToastsToClear(admin);
    await expect(admin.getByTestId('cash-not-started')).toContainText('Todavía no se configuró la caja');
    await admin.getByTestId('opening-cta').click();
    const dialog = admin.getByTestId('cash-opening-dialog');
    await dialog.locator('#opening-amount-0').fill('200');
    await dialog.getByLabel(run.bankAccountName).fill('1000');
    await dialog.getByTestId('opening-save').click();
    await expect(admin.getByText('Saldo inicial guardado')).toBeVisible();
  });

  test('07. registra cliente, producto con personalización y técnica', async () => {
    await admin.goto('/clientes');
    await waitForToastsToClear(admin);
    await admin.click('button:has-text("Nuevo cliente")');
    await admin.fill('#name', run.clientName);
    await admin.fill('#email', `cliente.${suffix}@e2e.test`);
    await admin.fill('#phone', '987654321');
    await admin.click('div[role="dialog"] button:has-text("Crear cliente")');
    await expect(admin.getByText('Cliente creado correctamente')).toBeVisible();

    await admin.goto('/productos');
    await waitForToastsToClear(admin);
    await admin.click('button:has-text("Nuevo producto")');
    await admin.fill('#name', run.productName);
    await admin.fill('#sku', `E2E-${stamp()}`);
    await admin.fill('#price_unit', '20');
    await admin.click('#requires_customization');
    await admin.click('div[role="dialog"] button:has-text("Crear producto")');
    await expect(admin.getByText('Producto creado correctamente')).toBeVisible();
    await expect(admin.locator('tr', { hasText: run.productName })).toContainText('Unidad: S/ 20.00');

    await admin.goto('/productos/tecnicas');
    await waitForToastsToClear(admin);
    await admin.click('button:has-text("Nueva técnica")');
    await admin.fill('#tech-name', run.techniqueName);
    await admin.fill('#tech_price_unit', '5');
    await admin.click('div[role="dialog"] button:has-text("Crear técnica")');
    await expect(admin.getByText('Técnica creada correctamente')).toBeVisible();
  });

  test('08. arma la cotización con 10 % de descuento', async () => {
    await admin.goto('/cotizaciones');
    await waitForToastsToClear(admin);
    await admin.click('button:has-text("Nueva cotización")');
    const dialog = admin.getByRole('dialog', { name: 'Nueva cotización' });
    // El admin tiene tienda: la cotización queda en ella (la ve el gestor).
    await expect(dialog.getByTestId('quotation-fixed-store')).toContainText(run.storeCode);
    await chooseSearchableSelect(admin, 'Cliente', run.clientName);
    await chooseSearchableSelect(admin, 'Producto', run.productName);
    await chooseSearchableSelect(admin, 'Técnica', run.techniqueName);
    await chooseSelectNear(admin, 'Modo de precio', 'Por unidad');
    await dialog.locator('div.space-y-1', { hasText: 'Cantidad' }).locator('input').first().fill('10');
    await dialog.getByRole('combobox', { name: 'Descuento del ítem 1' }).click();
    await admin.getByRole('option', { name: 'Descuento %' }).click();
    await dialog.locator('#item-discount-0').fill('10');
    await expect(dialog.getByTestId('item-price-breakdown-0')).toContainText(
      'Producto S/ 20.00 + técnica S/ 5.00 = S/ 25.00 c/u → con descuento S/ 22.50 c/u',
    );
    await expect(dialog.getByTestId('quotation-totals')).toContainText(TOTAL);
    await dialog.getByRole('button', { name: 'Crear cotización' }).click();
    await expect(admin.getByText('Cotización creada correctamente')).toBeVisible();

    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Lista', exact: true }).click();
    await admin.getByText(run.clientName, { exact: true }).first().click();
    const detail = quotationDetail(admin);
    await expect(detail).toBeVisible();
    const title = (await detail.getByRole('heading', { name: /^Cotización #\d+$/ }).textContent()) ?? '';
    quotationId = Number(title.replace(/\D/g, ''));
    expect(quotationId).toBeGreaterThan(0);
    await expect(detail.getByText('−10%').first()).toBeVisible();
  });

  test('09. el PDF se ve y el enlace del cliente abre el PDF', async ({ browser }) => {
    const detail = await openQuotation(admin);
    await detail.getByRole('button', { name: 'Vista previa del PDF' }).click();
    const preview = admin.getByRole('dialog', { name: `Vista previa — Cotización #${quotationId}` });
    await expect(preview.locator('iframe[title="Vista previa del PDF"]')).toBeVisible({ timeout: 20_000 });
    await admin.keyboard.press('Escape');
    await expect(preview).toBeHidden();

    await detail.getByRole('button', { name: 'Compartir con el cliente' }).click();
    const share = admin.getByRole('dialog', { name: /^Compartir COT-\d{4}$/ });
    const url = await share.getByRole('textbox', { name: 'Enlace de la cotización' }).inputValue();
    expect(url).toMatch(/\/c\/[A-Za-z0-9_-]{22}$/);
    await admin.keyboard.press('Escape');

    const [visitorContext, visitor] = await newPage(browser);
    const pdfResponse = visitor.waitForResponse((response) => /\/public\/q\/[A-Za-z0-9_-]{22}\/pdf$/.test(response.url()));
    await visitor.goto(new URL(url).pathname);
    const pdf = await pdfResponse;
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()['content-type']).toContain('application/pdf');
    await visitorContext.close();
  });

  test('10. el cliente acepta y paga un adelanto por transferencia', async () => {
    const detail = await openQuotation(admin);
    await waitForToastsToClear(admin);
    await detail.getByRole('button', { name: 'Aceptada', exact: true }).click();
    const advance = admin.locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' });
    // Sugiere la mitad del total.
    await expect(admin.locator('#advance-amount')).toHaveValue('132.75');
    await admin.fill('#advance-amount', ADVANCE);
    await admin.click('#advance-method');
    await admin.getByRole('option', { name: 'Transferencia bancaria' }).click();
    await admin.click('#advance-account');
    await admin.getByRole('option', { name: new RegExp(run.bankAccountName) }).click();
    await admin.fill('#advance-operation-number', '000123');
    await advance.getByRole('button', { name: 'Sí, registrar adelanto' }).click();
    await expect(admin.getByText('Cotización aceptada y adelanto registrado')).toBeVisible();
  });

  test('11. sube el diseño (mockup) y avanza a "En proceso"', async () => {
    const detail = await openQuotation(admin);
    await detail.getByRole('tab', { name: 'Diseños' }).click();
    await detail.getByTestId('mockup-file-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(admin.getByText('Diseño subido')).toBeVisible({ timeout: 15_000 });
    await expect(detail.getByRole('button', { name: /Ver diseño/ })).toBeVisible();

    await advanceStatus(admin, 'Diseño en aprobación');
    await advanceStatus(admin, 'En proceso');
  });

  test('12. crea la orden de compra para el gestor', async () => {
    const detail = await openQuotation(admin);
    await detail.getByRole('tab', { name: 'Compras' }).click();
    await detail.getByRole('button', { name: 'Crear orden de compra' }).click();
    await detail.locator('label', { hasText: run.productName }).click();
    await chooseSearchableSelect(admin, 'Asignado a', run.gestorEmail);
    await detail.getByRole('button', { name: 'Crear orden', exact: true }).click();
    await expect(admin.getByText('Orden de compra creada')).toBeVisible();
  });

  test('13. el gestor ve la cotización de su tienda y registra la compra', async () => {
    const detail = await openQuotation(gestor);
    // El cambio de estado a mano es solo de administradores.
    await expect(detail.getByRole('combobox', { name: 'Cambiar estado' })).toHaveCount(0);
    await detail.getByRole('tab', { name: 'Compras' }).click();
    await detail.locator('button[title="Registrar compra"]').first().click();
    await gestor.fill('#purchase-amount', PURCHASE_AMOUNT);
    await detail.getByTestId('invoice-question').getByRole('button', { name: 'Sí, llega después' }).click();
    await detail.getByRole('button', { name: 'Guardar compra' }).click();
    await expect(gestor.getByText(/Quedó en Facturas → "Compras sin factura"/)).toBeVisible();
    await detail.getByRole('button', { name: /Ver compras \(1\)/ }).click();
    await expect(detail.getByTestId('purchase-lines').getByText('Factura pendiente')).toBeVisible();
  });

  test('14. el gestor no entra a Estadísticas', async () => {
    await gestor.goto('/estadisticas');
    await expect(gestor).toHaveURL(/\/$/);
    // El gestor termina aquí: se cierra su pestaña (memoria, ver paso 04).
    await gestorContext.close();
  });

  test('15. el admin registra la factura de la compra', async () => {
    await admin.goto('/facturas');
    await waitForToastsToClear(admin);
    const tab = admin.getByTestId('pending-purchases-tab');
    await expect(tab).toContainText('1');
    await tab.click();
    const inbox = admin.getByTestId('pending-purchases');
    await inbox.getByRole('button', { name: 'Seleccionar la página' }).click();
    await inbox.getByRole('button', { name: 'Registrar factura' }).click();
    const dialog = admin.getByTestId('link-invoice-dialog');
    await dialog.locator('#invoice-series').fill(`F001-${stamp().slice(-6)}`);
    await dialog.locator('#invoice-total').fill(PURCHASE_AMOUNT);
    await dialog.getByRole('button', { name: 'Guardar factura' }).click();
    await expect(admin.getByText('Factura vinculada')).toBeVisible();
    await expect(inbox.getByText('No hay compras sin factura')).toBeVisible();
  });

  test('16. el PDF de la orden de compra se genera', async () => {
    await admin.goto('/ordenes-compra');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: /^PDF de la orden OC-\d{4}$/ }).first().click();
    const pdf = admin.getByRole('dialog', { name: /^Orden de compra OC-\d{4}$/ });
    await expect(pdf.locator('iframe[title="Vista previa del PDF"]')).toBeVisible({ timeout: 20_000 });
    await admin.keyboard.press('Escape');
  });

  test('17. el admin salta a "Lista para entregar", entrega, cobra el saldo y finaliza', async () => {
    const detail = await openQuotation(admin);
    await detail.getByRole('combobox', { name: 'Cambiar estado' }).click();
    await admin.getByRole('option', { name: 'Lista para entregar' }).click();
    const confirm = admin.getByRole('dialog', { name: '¿Cambiar el estado de la cotización?' });
    await confirm.locator('#force-status-note').fill('El cliente aprobó el acabado por WhatsApp');
    await confirm.getByRole('button', { name: 'Cambiar estado' }).click();
    await expect(admin.getByText('Estado cambiado a "Lista para entregar"')).toBeVisible();

    await advanceStatus(admin, 'Entregada');

    await detail.getByRole('tab', { name: 'Pagos' }).click();
    await detail.getByRole('button', { name: 'Registrar pago' }).click();
    await admin.fill('#payment-amount', BALANCE);
    await admin.click('#payment-method');
    await admin.locator('[role="option"]', { hasText: 'Efectivo' }).first().click();
    await admin.click('div[role="dialog"] button:has-text("Guardar pago")');
    await expect(admin.getByText('Pago registrado')).toBeVisible();
    await expect(detail.locator('div.rounded-lg', { hasText: 'Saldo pendiente' }).last()).toContainText('S/ 0.00');
    await expect(detail.locator('[data-testid^="quotation-payment-"]')).toHaveCount(2);

    await waitForToastsToClear(admin);
    await detail.getByRole('button', { name: 'Finalizada', exact: true }).click();
    const finish = admin.getByRole('dialog', { name: /^Finalizar COT-\d{4}$/ });
    await finish.getByTestId('invoice-question').getByRole('button', { name: 'No', exact: true }).click();
    await finish.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await expect(admin.getByText('Cotización finalizada', { exact: true })).toBeVisible();

    await detail.getByRole('tab', { name: 'Historial' }).click();
    await expect(detail.getByText('El cliente aprobó el acabado por WhatsApp')).toBeVisible();
  });

  test('18. Caja: un gasto, el IGV del mes y el Excel', async () => {
    await admin.goto('/caja');
    await waitForToastsToClear(admin);
    const description = `Utiles de oficina ${suffix}`;
    await admin.click('button:has-text("Nuevo movimiento")');
    await admin.locator('div[role="dialog"]').locator('div.space-y-2', { hasText: 'Tipo' }).locator('button[role="combobox"]').click();
    await admin.locator('[role="option"]', { hasText: 'Egreso' }).click();
    await chooseSearchableSelect(admin, 'Categoría', 'Otro egreso');
    await admin.fill('#cash-movement-amount', '30.00');
    await pickDate(admin, 'cash-movement-date', businessTodayDay());
    await admin.fill('#cash-movement-description', description);
    await admin.click('div[role="dialog"] button:has-text("Registrar movimiento")');
    await expect(admin.getByText('Movimiento registrado correctamente')).toBeVisible();
    await expect(admin.locator('tr', { hasText: description })).toBeVisible();

    // IGV: ventas 40.50 (dentro de los cobros 265.50) − compras 18.00 (factura de 118) = 22.50.
    await admin.getByRole('button', { name: 'Ver cómo se calculó' }).click();
    const igv = admin.getByRole('dialog', { name: /¿Cómo se calculó el IGV/ });
    const equation = igv.getByTestId('igv-equation');
    await expect(equation).toContainText('40.50');
    await expect(equation).toContainText('18.00');
    await expect(equation).toContainText('22.50');
    const igvDownload = admin.waitForEvent('download');
    await igv.getByRole('button', { name: 'Exportar Excel' }).click();
    expect((await igvDownload).suggestedFilename()).toMatch(/^igv-\d{4}-\d{2}\.xlsx$/);
    await admin.keyboard.press('Escape');

    await waitForToastsToClear(admin);
    const cashDownload = admin.waitForEvent('download');
    await admin.getByRole('button', { name: 'Exportar Excel' }).click();
    expect((await cashDownload).suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('19. préstamo a una persona con su cobro, visible en Caja', async () => {
    await admin.goto('/prestamos');
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Nuevo préstamo' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Nuevo préstamo' });
    await dialog.locator('#loan-borrower').fill(run.borrower);
    await dialog.locator('#loan-principal').fill('500');
    await dialog.locator('#loan-rate').fill('10');
    await expect(dialog.getByTestId('loan-interest-preview')).toContainText('550.00');
    await pickDate(admin, 'loan-date', businessTodayDay());
    await dialog.getByRole('button', { name: 'Registrar préstamo' }).click();
    await expect(admin.getByText('Préstamo registrado')).toBeVisible();

    const row = admin.locator('tr', { hasText: run.borrower });
    await expect(row).toContainText('Por cobrar');
    await row.getByRole('button', { name: `Ver el préstamo a ${run.borrower}` }).click();
    const detail = admin.getByRole('dialog', { name: new RegExp(`Préstamo a ${run.borrower}`) });
    await expect(detail.locator('#loan-payment-amount')).toHaveValue('550');
    await pickDate(admin, 'loan-payment-date', businessTodayDay());
    await detail.getByRole('button', { name: 'Registrar cobro' }).click();
    await expect(admin.getByText('Cobro registrado: el préstamo quedó pagado')).toBeVisible();
    await admin.keyboard.press('Escape');
    await expect(row).toContainText('Pagado');

    await admin.goto('/caja');
    await expect(admin.getByText(`Préstamo a ${run.borrower}`)).toBeVisible();
    await expect(admin.getByText(`Interés de préstamo — ${run.borrower}`)).toBeVisible();
  });

  test('20. Estadísticas muestra lo cobrado y las gráficas', async () => {
    await admin.goto('/estadisticas');
    await expect(admin.locator('h1', { hasText: 'Estadísticas' })).toBeVisible();
    await expect(admin.getByTestId('kpi-collected')).toBeVisible();
    await expect(admin.getByTestId('kpi-won')).toBeVisible();
    await expect(admin.getByTestId('chart-income-expenses').locator('.recharts-surface').first()).toBeVisible();
    await expect(admin.getByTestId('chart-quoted-won').locator('.recharts-surface').first()).toBeVisible();
  });

  test('21. el Excel de cotizaciones se descarga', async () => {
    await admin.goto('/cotizaciones');
    await waitForToastsToClear(admin);
    const download = admin.waitForEvent('download');
    await admin.getByRole('button', { name: 'Exportar Excel' }).click();
    expect((await download).suggestedFilename()).toMatch(/^cotizaciones-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  test('22. todas las vistas del admin cargan sin errores de consola', async () => {
    const views: { path: string; heading: string }[] = [
      { path: '/', heading: 'Panel principal' },
      { path: '/seguridad/usuarios', heading: 'Usuarios' },
      { path: '/configuracion/tiendas', heading: 'Tiendas' },
      { path: '/clientes', heading: 'Clientes' },
      { path: '/productos', heading: 'Productos' },
      { path: '/cotizaciones', heading: 'Cotizaciones' },
      { path: '/ordenes-compra', heading: 'Órdenes de compra' },
      { path: '/configuracion/documentos', heading: 'Documentos de la empresa' },
      { path: '/caja', heading: 'Caja' },
      { path: '/caja/cierres', heading: 'Cierres de caja' },
      { path: '/pagos', heading: 'Pagos recibidos' },
      { path: '/facturas', heading: 'Facturas' },
      { path: '/prestamos', heading: 'Préstamos' },
      { path: '/deudas-personal', heading: 'Deudas a personal' },
      { path: '/por-cobrar', heading: 'Por cobrar' },
      { path: '/recordatorios', heading: 'Recordatorios' },
      { path: '/estadisticas', heading: 'Estadísticas' },
    ];
    const errors: string[] = [];
    admin.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${admin.url()}: ${message.text()}`);
    });
    admin.on('pageerror', (error) => errors.push(`${admin.url()}: ${error.message}`));
    for (const view of views) {
      await admin.goto(view.path);
      await expect(admin.locator('h1', { hasText: view.heading }), view.path).toBeVisible();
    }
    expect(errors, errors.join(' | ')).toHaveLength(0);
  });
});
