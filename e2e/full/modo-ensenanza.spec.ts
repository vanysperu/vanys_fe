import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import {
  apiJson,
  businessTodayDay,
  chooseSearchableSelect,
  createDisposableCashCompany,
  loginViaUi,
  pageAuthToken,
  pickDate,
  waitForToastsToClear,
  type DisposableCashCompany,
} from '../helpers';

// Modo enseñanza (pedido del usuario, 21-nov): un administrador entra a su
// empresa de práctica y completa TODAS las lecciones siguiendo la luz, como lo
// haría una persona. Comprueba también que fuera de lo iluminado no se puede
// tocar nada, que "Reiniciar práctica" funciona, que vuelve a su cuenta real y
// que la práctica no ensucia ni la empresa real ni las listas de plataforma.
// Corre con el E2E completo (npm run test:e2e:full, base grulla_e2e_local).

const SUPERADMIN = { email: 'admin@acme.test', password: 'Test1234' };
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const TOTAL_LESSONS = 10;

interface Envelope<T> {
  success: boolean;
  data: T;
}

test.describe.configure({ mode: 'serial' });

let company: DisposableCashCompany;
let superToken = '';
let adminContext: BrowserContext;
let admin: Page;

const newWatchedPage = async (browser: Browser, label: string): Promise<[BrowserContext, Page]> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('crash', () => console.log(`[${label}] la pestaña se cayó (crash) en ${page.url()}`));
  page.on('pageerror', (error) => console.log(`[${label}] error de la página en ${page.url()}: ${error.message}`));
  return [context, page];
};

// ---- Cómo sigue una persona la lección ----

const stepTitle = (page: Page) => page.getByTestId('tutorial-step-title');
const expectStep = (page: Page, title: string | RegExp) => expect(stepTitle(page)).toHaveText(title, { timeout: 15_000 });
const ack = async (page: Page, title: string | RegExp) => {
  await expectStep(page, title);
  await page.getByTestId('tutorial-ack').click();
};
const detail = (page: Page) => page.getByRole('dialog', { name: /^Cotización #\d+$/ });

// Paso "Abre ...": por el menú, abriendo el grupo si está cerrado.
const openFromMenu = async (page: Page, label: string, path: string, group: string) => {
  await expectStep(page, `Abre "${label}"`);
  const link = page.locator(`[data-slot="sidebar"] a[href="${path}"]`);
  if (!(await link.isVisible())) {
    await page.locator('[data-slot="sidebar"]').getByRole('button', { name: group, exact: true }).click();
  }
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
};

// Paso "Abre COT-0001": el número sale del título del paso.
const openPreparedQuotation = async (page: Page) => {
  await expectStep(page, /^Abre COT-\d{4}$/);
  const id = Number(((await stepTitle(page).textContent()) ?? '').replace(/\D/g, ''));
  await page.locator(`[data-testid="quotations-board"] [data-quotation-id="${id}"]`).click();
  await expect(detail(page)).toBeVisible();
};

const openTab = async (page: Page, tab: string) => {
  await expectStep(page, `Entra a la pestaña "${tab}"`);
  await detail(page).getByRole('tab', { name: tab }).click();
};

const markStatus = async (page: Page, label: string) => {
  await expectStep(page, `Marca "${label}"`);
  await detail(page).getByRole('button', { name: label, exact: true }).click();
};

const finishLesson = async (page: Page) => {
  const finished = page.getByTestId('tutorial-finished');
  await expect(finished).toBeVisible({ timeout: 15_000 });
  await finished.getByRole('button', { name: 'Ver todas las lecciones' }).click();
  await expect(page).toHaveURL(/\/aprender$/);
};

const startLesson = async (page: Page, code: string) => {
  await expect(page).toHaveURL(/\/aprender$/);
  await waitForToastsToClear(page);
  await page.getByTestId(`lesson-${code}`).getByRole('button').click();
  await expect(page.locator('[data-tutorial-card]')).toBeVisible({ timeout: 15_000 });
};

test.beforeAll(async ({ browser, request }) => {
  const login = await apiJson<Envelope<{ Jwt: string }>>(request, 'post', '/signin', null, SUPERADMIN);
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  superToken = login.body.data.Jwt;
  company = await createDisposableCashCompany(request, superToken);
  [adminContext, admin] = await newWatchedPage(browser, 'admin');
});

test.afterAll(async () => {
  await adminContext?.close();
});

test.describe('Modo enseñanza', () => {
  test.setTimeout(180_000);

  test('01. desde "Aprender", el admin entra a su empresa de práctica', async () => {
    await loginViaUi(admin, company.adminEmail, company.password);
    await waitForToastsToClear(admin);
    await admin.getByRole('button', { name: 'Abrir menú de perfil' }).click();
    await admin.getByRole('button', { name: 'Aprender a usar el sistema' }).click();
    await expect(admin).toHaveURL(/\/aprender$/);
    await expect(admin.getByTestId('lesson-tour')).toBeVisible();
    await admin.getByRole('button', { name: 'Entrar a la práctica' }).click();
    await expect(admin.getByTestId('practice-mode-banner')).toBeVisible({ timeout: 20_000 });
    await expect(admin.getByTestId('course-progress')).toContainText(`0 de ${TOTAL_LESSONS} lecciones`);
  });

  test('02. lección "Conoce el sistema"', async () => {
    await startLesson(admin, 'tour');
    await ack(admin, 'Bienvenido al modo enseñanza');
    await ack(admin, 'Este es el menú');
    await ack(admin, 'El botón naranja crea cotizaciones');
    await ack(admin, 'Tus avisos');
    await ack(admin, 'Tu perfil');
    await finishLesson(admin);
  });

  test('03. "Tu primera cotización", y fuera de la luz no se puede tocar nada', async () => {
    await startLesson(admin, 'first-quotation');
    await expectStep(admin, 'Abre "Cotizaciones"');
    // Tocar fuera de lo iluminado no hace nada: la tarjeta avisa.
    await admin.getByTestId('lesson-catalog').getByRole('button').click({ force: true });
    await expect(admin.locator('[data-tutorial-card]')).toContainText('Primero haz lo que está iluminado.');
    await expect(admin).toHaveURL(/\/aprender$/);
    await expectStep(admin, 'Abre "Cotizaciones"');

    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await expectStep(admin, 'Crea una cotización nueva');
    await admin.locator('main button', { hasText: 'Nueva cotización' }).click();
    await expectStep(admin, 'Elige el cliente');
    await chooseSearchableSelect(admin, 'Cliente', 'Comercial Los Andes SAC');
    await expectStep(admin, 'Elige el producto');
    await chooseSearchableSelect(admin, 'Producto', 'Polo de algodón');
    await expectStep(admin, 'Elige cómo se personaliza');
    await chooseSearchableSelect(admin, 'Técnica', 'Bordado');
    await expectStep(admin, '¿Cuántas unidades?');
    await admin.locator('[data-tour="quotation-item-0-quantity"] input').fill('50');
    await admin.getByTestId('tutorial-ack').click();
    await ack(admin, 'Así se calcula el total');
    await expectStep(admin, 'Guarda la cotización');
    await admin.locator('[data-tour="quotation-submit"]').click();
    await ack(admin, '¡Tu cotización está lista!');
    await finishLesson(admin);
  });

  test('04. "Envíala a tu cliente"', async () => {
    await startLesson(admin, 'share-quotation');
    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await openPreparedQuotation(admin);
    await expectStep(admin, 'Mira el PDF');
    await detail(admin).getByRole('button', { name: 'Vista previa del PDF' }).click();
    await ack(admin, 'Este es el PDF de la cotización');
    await expectStep(admin, 'Cierra la vista previa');
    await admin.getByRole('dialog', { name: /Vista previa/ }).getByRole('button', { name: 'Cerrar' }).click();
    await expectStep(admin, 'Compártela');
    await detail(admin).getByRole('button', { name: 'Compartir con el cliente' }).click();
    await ack(admin, 'Enlace, WhatsApp o correo');
    await expectStep(admin, 'Cierra esta ventana');
    await admin.getByRole('dialog', { name: /^Compartir COT-\d{4}$/ }).getByRole('button', { name: 'Cerrar' }).click();
    await finishLesson(admin);
  });

  test('05. "El cliente aceptó: adelanto y pagos"', async () => {
    await startLesson(admin, 'accept-and-collect');
    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await openPreparedQuotation(admin);
    await expectStep(admin, 'Márcala como "Aceptada"');
    await detail(admin).getByRole('button', { name: 'Aceptada', exact: true }).click();
    await expectStep(admin, 'Registra el adelanto');
    await admin.locator('div[role="dialog"]', { hasText: '¿El cliente pagó adelanto?' }).getByRole('button', { name: 'Sí, registrar adelanto' }).click();
    await openTab(admin, 'Pagos');
    await expectStep(admin, 'Registra otro pago');
    await detail(admin).getByRole('button', { name: 'Registrar pago' }).click();
    await expectStep(admin, 'Llena el pago');
    await admin.fill('#payment-amount', '50');
    await admin.click('#payment-method');
    await admin.locator('[role="option"]', { hasText: 'Efectivo' }).first().click();
    await detail(admin).getByRole('button', { name: 'Guardar pago' }).click();
    await ack(admin, 'Pagado y saldo pendiente');
    await finishLesson(admin);
  });

  test('06. "Diseño, producción y entrega"', async () => {
    await startLesson(admin, 'production-and-delivery');
    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await openPreparedQuotation(admin);
    await openTab(admin, 'Diseños');
    await expectStep(admin, 'Sube el diseño');
    await detail(admin).getByTestId('mockup-file-input').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 });
    for (const status of ['Diseño en aprobación', 'En proceso', 'Lista para entregar', 'Entregada']) {
      await markStatus(admin, status);
    }
    await expectStep(admin, 'Cierra la cotización');
    await detail(admin).getByRole('button', { name: 'Finalizada', exact: true }).click();
    await expectStep(admin, '¿Emitiste factura?');
    const finish = admin.getByRole('dialog', { name: /^Finalizar COT-\d{4}$/ });
    await finish.getByTestId('invoice-question').getByRole('button', { name: 'No', exact: true }).click();
    await finish.getByRole('button', { name: 'Finalizar', exact: true }).click();
    await ack(admin, '¡Pedido cerrado!');
    await finishLesson(admin);
  });

  test('07. "Compras del pedido"', async () => {
    await startLesson(admin, 'purchases');
    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await openPreparedQuotation(admin);
    await openTab(admin, 'Compras');
    await expectStep(admin, 'Crea la orden de compra');
    await detail(admin).getByRole('button', { name: 'Crear orden de compra' }).click();
    await expectStep(admin, 'Arma la orden');
    await detail(admin).locator('label', { hasText: 'Polo de algodón' }).click();
    await chooseSearchableSelect(admin, 'Asignado a', 'practica');
    await detail(admin).getByRole('button', { name: 'Crear orden', exact: true }).click();
    await expectStep(admin, 'Registra la compra');
    await detail(admin).locator('button[title="Registrar compra"]').first().click();
    await expectStep(admin, '¿Cuánto pagaste?');
    await admin.fill('#purchase-amount', '300');
    await detail(admin).getByTestId('invoice-question').getByRole('button', { name: 'No lleva factura' }).click();
    await detail(admin).getByRole('button', { name: 'Guardar compra' }).click();
    await ack(admin, '¡Compra registrada!');
    await finishLesson(admin);
  });

  test('08. "Tus clientes"', async () => {
    await startLesson(admin, 'clients');
    await openFromMenu(admin, 'Clientes', '/clientes', 'Ventas');
    await expectStep(admin, 'Agrega un cliente');
    await admin.locator('main button', { hasText: 'Nuevo cliente' }).click();
    await expectStep(admin, 'Llena sus datos');
    await admin.fill('#name', 'Inversiones Sol');
    await admin.click('div[role="dialog"] button:has-text("Crear cliente")');
    await ack(admin, '¡Cliente guardado!');
    await finishLesson(admin);
  });

  test('09. "Productos y técnicas"', async () => {
    await startLesson(admin, 'catalog');
    await openFromMenu(admin, 'Productos', '/productos', 'Ventas');
    await expectStep(admin, 'Agrega un producto');
    await admin.locator('main button', { hasText: 'Nuevo producto' }).click();
    await expectStep(admin, 'Nombre y precios');
    await admin.fill('#name', 'Gorra drill');
    await admin.fill('#price_unit', '15');
    await admin.click('div[role="dialog"] button:has-text("Crear producto")');
    await expectStep(admin, 'Ahora las técnicas');
    await admin.getByRole('tab', { name: 'Técnicas de personalización' }).click();
    await expectStep(admin, 'Agrega una técnica');
    await admin.locator('main button', { hasText: 'Nueva técnica' }).click();
    await expectStep(admin, 'Nombre y precio');
    await admin.fill('#tech-name', 'Estampado DTF');
    await admin.fill('#tech_price_unit', '5');
    await admin.click('div[role="dialog"] button:has-text("Crear técnica")');
    await ack(admin, '¡Catálogo al día!');
    await finishLesson(admin);
  });

  test('10. "Caja e IGV del mes"', async () => {
    await startLesson(admin, 'cash');
    await openFromMenu(admin, 'Caja', '/caja', 'Finanzas');
    await ack(admin, 'El resumen del mes');
    await expectStep(admin, '¿De dónde sale el IGV?');
    await admin.getByRole('button', { name: 'Ver cómo se calculó' }).click();
    await ack(admin, 'IGV de ventas menos IGV de compras');
    await expectStep(admin, 'Cierra el detalle');
    await admin.getByRole('dialog', { name: /¿Cómo se calculó el IGV/ }).getByRole('button', { name: 'Cerrar' }).click();
    await expectStep(admin, 'Registra un gasto');
    await admin.locator('main button', { hasText: 'Nuevo movimiento' }).click();
    await expectStep(admin, 'Llena el movimiento');
    const movement = admin.locator('div[role="dialog"]');
    await movement.locator('div.space-y-2', { hasText: 'Tipo' }).locator('button[role="combobox"]').click();
    await admin.locator('[role="option"]', { hasText: 'Egreso' }).click();
    await chooseSearchableSelect(admin, 'Categoría', 'Otro egreso');
    await admin.fill('#cash-movement-amount', '30.00');
    await pickDate(admin, 'cash-movement-date', businessTodayDay());
    await admin.fill('#cash-movement-description', 'Utiles de oficina');
    await admin.click('div[role="dialog"] button:has-text("Registrar movimiento")');
    await ack(admin, 'Todo en Excel');
    await finishLesson(admin);
  });

  test('11. "Tus cuentas para cobrar"', async () => {
    await startLesson(admin, 'payment-accounts');
    await openFromMenu(admin, 'Documentos de la empresa', '/configuracion/documentos', 'Configuración');
    await expectStep(admin, 'Agrega una cuenta');
    await admin.getByRole('button', { name: 'Agregar cuenta' }).click();
    await expectStep(admin, 'Número y CCI');
    const form = admin.getByTestId('payment-account-form');
    await form.getByRole('combobox').first().click();
    await admin.getByRole('option', { name: 'Cuenta bancaria' }).click();
    await form.locator('#account-name-new').fill('BBVA Soles');
    await form.locator('#account-ref1-new').fill('0011-0123-0100012345');
    await form.locator('#account-ref3-new').fill('01112300010001234567');
    await form.getByRole('button', { name: 'Guardar' }).click();
    await ack(admin, '¡Cuenta lista!');
    await finishLesson(admin);
    await expect(admin.getByTestId('course-progress')).toContainText(`${TOTAL_LESSONS} de ${TOTAL_LESSONS} lecciones`);
  });

  test('12. "Reiniciar práctica" deja la empresa como nueva y conserva el avance', async () => {
    const practiceToken = await pageAuthToken(admin);
    const before = await apiJson<Envelope<{ data: unknown[] }>>(admin.request, 'get', '/client/list?page=1&limit=100', practiceToken);
    expect(before.body.data.data.length).toBe(4);

    await admin.getByTestId('practice-mode-banner').getByRole('button', { name: 'Reiniciar práctica' }).click();
    // Se espera la respuesta del reinicio y la recarga (la página ya estaba en /aprender).
    const reset = admin.waitForResponse((response) => response.url().includes('/tutorial/practice/reset'));
    const reload = admin.waitForEvent('load');
    await admin.getByRole('button', { name: 'Sí, reiniciar' }).click();
    expect((await reset).status()).toBe(200);
    await reload;
    await expect(admin.getByTestId('practice-mode-banner')).toBeVisible({ timeout: 20_000 });
    await expect(admin.getByTestId('course-progress')).toContainText(`${TOTAL_LESSONS} de ${TOTAL_LESSONS} lecciones`);

    const after = await apiJson<Envelope<{ data: unknown[] }>>(admin.request, 'get', '/client/list?page=1&limit=100', await pageAuthToken(admin));
    expect(after.body.data.data.length).toBe(3);
  });

  test('13. vuelve a su cuenta real: sin franja, con el avance del equipo, y nada de la práctica se mezcló', async () => {
    await admin.getByTestId('practice-mode-banner').getByRole('button', { name: 'Volver a mi cuenta' }).click();
    await expect(admin).toHaveURL(/\/aprender$/);
    await expect(admin.getByRole('button', { name: 'Entrar a la práctica' })).toBeVisible({ timeout: 20_000 });
    await expect(admin.getByTestId('practice-mode-banner')).toHaveCount(0);
    const team = admin.getByTestId('team-progress');
    await expect(team.locator('tr', { hasText: company.adminEmail })).toContainText(`${TOTAL_LESSONS} de ${TOTAL_LESSONS}`);

    // La empresa real no tiene ni una cotización ni un cliente de la práctica.
    const realToken = await pageAuthToken(admin);
    const quotations = await apiJson<Envelope<{ data: unknown[] }>>(admin.request, 'get', '/quotation/list?page=1&limit=10', realToken);
    expect(quotations.body.data.data).toHaveLength(0);
    const clients = await apiJson<Envelope<{ data: unknown[] }>>(admin.request, 'get', '/client/list?page=1&limit=10', realToken);
    expect(clients.body.data.data).toHaveLength(0);

    // Las empresas de práctica no salen en la lista de empresas del Super Administrador.
    const companies = await apiJson<Envelope<{ data: { business_name: string }[] }>>(
      admin.request,
      'get',
      '/company/list?page=1&limit=100',
      superToken,
    );
    expect(companies.body.data.data.some((row) => row.business_name.startsWith('Práctica ·'))).toBe(false);
  });

  test('14. el gestor practica con sus propios permisos: su primera cotización', async ({ browser }) => {
    const [gestorContext, gestor] = await newWatchedPage(browser, 'gestor');
    await loginViaUi(gestor, company.gestorEmail, company.password);
    await gestor.goto('/aprender');
    // Un gestor no ve las lecciones de configuración de la empresa.
    await expect(gestor.getByTestId('lesson-first-quotation')).toBeVisible();
    await expect(gestor.getByTestId('lesson-payment-accounts')).toHaveCount(0);
    await gestor.getByTestId('lesson-first-quotation').getByRole('button', { name: 'Practicar' }).click();
    await expect(gestor.getByTestId('practice-mode-banner')).toBeVisible({ timeout: 20_000 });
    // "Practicar" arranca esa lección sola al entrar.
    await openFromMenu(gestor, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await expectStep(gestor, 'Crea una cotización nueva');
    await gestor.locator('main button', { hasText: 'Nueva cotización' }).click();
    await chooseSearchableSelect(gestor, 'Cliente', 'Colegio San Martín');
    await chooseSearchableSelect(gestor, 'Producto', 'Libreta A5');
    // La libreta no lleva personalización: el paso de la técnica se salta solo.
    await expectStep(gestor, '¿Cuántas unidades?');
    await gestor.locator('[data-tour="quotation-item-0-quantity"] input').fill('20');
    await gestor.getByTestId('tutorial-ack').click();
    await ack(gestor, 'Así se calcula el total');
    await gestor.locator('[data-tour="quotation-submit"]').click();
    await ack(gestor, '¡Tu cotización está lista!');
    await finishLesson(gestor);
    await gestor.getByTestId('practice-mode-banner').getByRole('button', { name: 'Volver a mi cuenta' }).click();
    await expect(gestor.getByRole('button', { name: 'Entrar a la práctica' })).toBeVisible({ timeout: 20_000 });
    await gestorContext.close();
  });
});
