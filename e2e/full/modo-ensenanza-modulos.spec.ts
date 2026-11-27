import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  apiJson,
  businessTodayDay,
  chooseSearchableSelect,
  chooseSelect,
  chooseSelectExact,
  createDisposableCashCompany,
  loginViaUi,
  pageAuthToken,
  pickAdultBirthDate,
  pickDate,
  stamp,
  waitForToastsToClear,
  type DisposableCashCompany,
} from '../helpers';
import {
  ack,
  detail,
  expectStep,
  finishLesson,
  lessonsTotal,
  checkTutorialAudit,
  newWatchedPage,
  openFromMenu,
  openPreparedQuotation,
  PNG_1X1,
  startLesson,
} from './tutorialHelpers';

// Modo enseñanza, el resto de los módulos (pedido del usuario, 21-nov: "faltan
// módulos todavía por generar su aprendizaje"). Una empresa con TODAS las
// funcionalidades contratadas (inventario, guías, stock de proveedores): su
// administrador completa las 23 lecciones nuevas siguiendo la luz. Después se
// revisa que la práctica no manda correos ni ocupa correos reales, y que el
// gestor solo ve las lecciones que su rol puede hacer.

const SUPERADMIN = { email: 'admin@acme.test', password: 'Test1234' };

interface Envelope<T> {
  success: boolean;
  data: T;
}

test.describe.configure({ mode: 'serial' });

let company: DisposableCashCompany;
let superToken = '';
let adminContext: BrowserContext;
let admin: Page;
const run = stamp();

test.beforeAll(async ({ browser, request }) => {
  const login = await apiJson<Envelope<{ Jwt: string }>>(request, 'post', '/signin', null, SUPERADMIN);
  expect(login.status, JSON.stringify(login.body)).toBe(200);
  superToken = login.body.data.Jwt;
  company = await createDisposableCashCompany(request, superToken);
  // Todas las funcionalidades: la práctica las copia de la empresa real.
  const features = await apiJson(request, 'put', `/company-feature/${company.companyId}`, superToken, {
    features: { inventory: true, dispatch_guide: true, supplier_stock: true },
  });
  expect(features.status, JSON.stringify(features.body)).toBe(200);
  [adminContext, admin] = await newWatchedPage(browser, 'admin');
});

// Lo que vería una persona en cada paso (auditoría, ver tutorialHelpers.ts).
test.afterEach(checkTutorialAudit);

test.afterAll(async () => {
  await adminContext?.close();
});

test.describe('Modo enseñanza: todos los módulos', () => {
  test.setTimeout(180_000);

  test('00. entra a la práctica: con todas las funcionalidades le tocan 33 lecciones', async () => {
    await loginViaUi(admin, company.adminEmail, company.password);
    await admin.goto('/aprender');
    await admin.getByRole('button', { name: 'Entrar a la práctica' }).click();
    await expect(admin.getByTestId('practice-mode-banner')).toBeVisible({ timeout: 20_000 });
    expect(await lessonsTotal(admin)).toBe(33);
    await expect(admin.getByTestId('lesson-section-operations')).toBeVisible();
  });

  test('01. Tu panel principal', async () => {
    await startLesson(admin, 'dashboard');
    await openFromMenu(admin, 'Inicio', '/');
    await ack(admin, 'Lo que te deben');
    await ack(admin, 'Tus cotizaciones por estado');
    await ack(admin, '¡Así empieza tu día!');
    await finishLesson(admin);
  });

  test('02. Órdenes de compra', async () => {
    await startLesson(admin, 'purchase-orders');
    await openFromMenu(admin, 'Órdenes de compra', '/ordenes-compra', 'Ventas');
    await expectStep(admin, 'Imprime la orden');
    await admin.locator('main button[aria-label^="PDF de la orden OC-"]').first().click();
    await ack(admin, 'Para quien sale a comprar');
    await expectStep(admin, 'Cierra el PDF');
    await admin.getByRole('dialog', { name: /^Orden de compra OC-/ }).getByRole('button', { name: 'Cerrar' }).click();
    await expectStep(admin, 'Registra lo que compraste');
    await admin.locator('main button[title="Registrar compra"]').first().click();
    await expectStep(admin, '¿Cuánto pagaste?');
    await admin.fill('#purchase-amount', '300');
    await admin.locator('main [data-testid="invoice-question"]').getByRole('button', { name: 'No lleva factura' }).click();
    await admin.locator('main').getByRole('button', { name: 'Guardar compra' }).click();
    await ack(admin, '¡Compra registrada!');
    await finishLesson(admin);
  });

  test('03. Tus proveedores', async () => {
    await startLesson(admin, 'suppliers');
    await openFromMenu(admin, 'Proveedores', '/proveedores', 'Ventas');
    await expectStep(admin, 'Agrega un proveedor');
    await admin.locator('main button', { hasText: 'Nuevo proveedor' }).click();
    await expectStep(admin, 'Sus datos');
    await admin.fill('#supplier-name', 'Importadora Lima SAC');
    await admin.getByRole('dialog', { name: 'Nuevo proveedor' }).getByRole('button', { name: 'Crear proveedor' }).click();
    await ack(admin, '¡Proveedor guardado!');
    await finishLesson(admin);
  });

  test('04. Stock de proveedores', async () => {
    await startLesson(admin, 'supplier-stock');
    await openFromMenu(admin, 'Stock de proveedores', '/stock-proveedores', 'Ventas');
    await expectStep(admin, 'Entra a "Fuentes"');
    await admin.getByRole('tab', { name: 'Fuentes' }).click();
    await expectStep(admin, 'Agrega una fuente');
    await admin.locator('main button', { hasText: 'Nueva fuente' }).click();
    await expectStep(admin, 'De qué proveedor y qué columnas');
    const dialog = admin.getByRole('dialog', { name: 'Nueva fuente de stock' });
    await chooseSearchableSelect(admin, 'Proveedor', 'Importadora Andina SAC');
    await dialog.locator('#stock-name').fill('Stock general');
    await dialog.getByRole('radio', { name: /Archivo que se sube/ }).click();
    await dialog.locator('#stock-code_column').fill('codigo');
    await dialog.locator('#stock-quantity_column').fill('stock');
    await dialog.getByRole('button', { name: 'Crear fuente' }).click();
    await ack(admin, '¡Fuente creada!');
    await finishLesson(admin);
  });

  test('05. Anuncios de tu web', async () => {
    await startLesson(admin, 'advertisements');
    await openFromMenu(admin, 'Anuncios', '/anuncios', 'Ventas');
    await expectStep(admin, 'Crea un anuncio');
    await admin.locator('main button', { hasText: 'Nuevo anuncio' }).click();
    await expectStep(admin, 'Título e imagen');
    const dialog = admin.getByRole('dialog', { name: 'Nuevo anuncio' });
    await dialog.locator('#advertisement-title').fill('Promo de verano');
    await dialog.locator('input[type="file"]').setInputFiles({ name: 'promo.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(dialog.getByTestId('advertisement-image-preview')).toBeVisible({ timeout: 15_000 });
    await dialog.getByRole('button', { name: 'Crear anuncio' }).click();
    await ack(admin, '¡Listo!');
    await finishLesson(admin);
  });

  test('06. Saldo inicial y cierres de caja', async () => {
    await startLesson(admin, 'cash-closings');
    await openFromMenu(admin, 'Cierres de caja', '/caja/cierres', 'Finanzas');
    await expectStep(admin, 'Configura el saldo inicial');
    await admin.getByTestId('opening-cta').click();
    await expectStep(admin, '¿Con cuánto empezó cada cuenta?');
    const dialog = admin.getByTestId('cash-opening-dialog');
    // Cada cuenta pide su monto (efectivo y el banco de práctica).
    const amounts = dialog.locator('input[id^="opening-amount-"]');
    // Se espera a que la ventana dibuje las cuentas antes de contarlas.
    await expect(amounts.nth(1)).toBeVisible();
    for (let index = 0; index < (await amounts.count()); index += 1) await amounts.nth(index).fill(index === 0 ? '200' : '1000');
    await dialog.getByTestId('opening-save').click();
    await ack(admin, 'El cuadre del mes');
    await finishLesson(admin);
  });

  test('07. Pagos recibidos', async () => {
    await startLesson(admin, 'payments');
    await openFromMenu(admin, 'Pagos recibidos', '/pagos', 'Finanzas');
    await expectStep(admin, 'Busca un cliente');
    await admin.fill('main input[placeholder="Buscar cliente..."]', 'Andes');
    await ack(admin, 'Cada cobro con su detalle');
    await ack(admin, 'Todo en Excel');
    await finishLesson(admin);
  });

  test('08. Por cobrar', async () => {
    await startLesson(admin, 'receivables');
    await openFromMenu(admin, 'Por cobrar', '/por-cobrar', 'Finanzas');
    await ack(admin, 'Lo que te deben');
    await expectStep(admin, 'Cobra desde aquí');
    await admin.locator('main button[aria-label="Registrar pago"]').first().click();
    await expectStep(admin, 'Registra el pago');
    await detail(admin).getByRole('button', { name: 'Registrar pago' }).click();
    await expectStep(admin, 'Llena el pago');
    await admin.fill('#payment-amount', '50');
    await admin.click('#payment-method');
    await admin.locator('[role="option"]', { hasText: 'Efectivo' }).first().click();
    await detail(admin).getByRole('button', { name: 'Guardar pago' }).click();
    await ack(admin, '¡Pago registrado!');
    await finishLesson(admin);
  });

  test('09. Facturas de compra', async () => {
    await startLesson(admin, 'invoices');
    await openFromMenu(admin, 'Facturas', '/facturas', 'Finanzas');
    await expectStep(admin, 'Compras sin factura');
    await admin.getByTestId('pending-purchases-tab').click();
    await expectStep(admin, 'Elige las compras de esa factura');
    const inbox = admin.getByTestId('pending-purchases');
    await inbox.getByRole('button', { name: 'Seleccionar la página' }).click();
    await expectStep(admin, 'Registra la factura');
    await inbox.getByRole('button', { name: 'Registrar factura' }).click();
    await expectStep(admin, 'Sus datos');
    const dialog = admin.getByTestId('link-invoice-dialog');
    await dialog.locator('#invoice-series').fill(`F001-${run.slice(-6)}`);
    await dialog.locator('#invoice-total').fill('300');
    await dialog.getByRole('button', { name: 'Guardar factura' }).click();
    await ack(admin, '¡Factura registrada!');
    await finishLesson(admin);
  });

  test('10. Deudas a personal', async () => {
    await startLesson(admin, 'employee-debts');
    await openFromMenu(admin, 'Deudas a personal', '/deudas-personal', 'Finanzas');
    await ack(admin, 'Lo que la empresa debe');
    await expectStep(admin, 'Devuélveselo');
    await admin.locator('main button', { hasText: 'Marcar como pagado' }).first().click();
    await expectStep(admin, '¿Cuánto y de qué cuenta?');
    await admin.getByRole('dialog', { name: 'Marcar deuda como pagada' }).getByRole('button', { name: 'Marcar como pagado' }).click();
    await ack(admin, '¡Deuda saldada!');
    await finishLesson(admin);
  });

  test('11. Préstamos', async () => {
    await startLesson(admin, 'loans');
    await openFromMenu(admin, 'Préstamos', '/prestamos', 'Finanzas');
    await expectStep(admin, 'Registra un préstamo');
    await admin.locator('main button', { hasText: 'Nuevo préstamo' }).click();
    await expectStep(admin, '¿A quién, cuánto y a qué interés?');
    const form = admin.getByRole('dialog', { name: 'Nuevo préstamo' });
    await form.locator('#loan-borrower').fill('Rosa Quispe');
    await form.locator('#loan-principal').fill('500');
    await form.locator('#loan-rate').fill('10');
    await pickDate(admin, 'loan-date', businessTodayDay());
    await form.getByRole('button', { name: 'Registrar préstamo' }).click();
    await expectStep(admin, 'Abre el préstamo');
    await admin.locator('main button[aria-label^="Ver el préstamo a"]').first().click();
    await expectStep(admin, 'Registra un cobro');
    await pickDate(admin, 'loan-payment-date', businessTodayDay());
    await admin.getByRole('dialog', { name: /Préstamo a Rosa Quispe/ }).getByRole('button', { name: 'Registrar cobro' }).click();
    await ack(admin, '¡Cobro registrado!');
    await finishLesson(admin);
  });

  test('12. Estadísticas', async () => {
    await startLesson(admin, 'statistics');
    await openFromMenu(admin, 'Estadísticas', '/estadisticas');
    await ack(admin, 'Elige el periodo');
    await ack(admin, 'Lo importante, arriba');
    await ack(admin, 'Gráficos y tablas');
    await finishLesson(admin);
  });

  test('13. Datos de tu empresa en la cotización', async () => {
    await startLesson(admin, 'company-documents');
    await openFromMenu(admin, 'Documentos de la empresa', '/configuracion/documentos', 'Configuración');
    await ack(admin, 'Los datos de tu empresa');
    await expectStep(admin, 'Tus condiciones');
    await admin.fill('#legal_terms_caption', 'Precios válidos por 15 días');
    await admin.locator('form', { has: admin.locator('#legal_terms_caption') }).getByRole('button', { name: 'Guardar', exact: true }).click();
    await ack(admin, '¡Guardado!');
    await finishLesson(admin);
  });

  test('14. Tu equipo: usuarios (sin correos y sin ocupar el correo real)', async () => {
    const email = `carla.${run}@ejemplo.test`;
    await startLesson(admin, 'users');
    await openFromMenu(admin, 'Usuarios', '/seguridad/usuarios', 'Configuración');
    await expectStep(admin, 'Agrega a una persona');
    await admin.locator('main button', { hasText: 'Nuevo usuario' }).click();
    await expectStep(admin, 'Sus datos, su rol y su tienda');
    await admin.fill('#name', 'Carla');
    await admin.fill('#paternal_lastname', 'Rios');
    await admin.fill('#email', email);
    await pickAdultBirthDate(admin, 'date_of_birth');
    await chooseSelect(admin, 'Tipo de documento', 'DNI');
    await admin.fill('#document_number', `4${run.slice(-7)}`);
    await chooseSelect(admin, 'Género', 'Femenino');
    await chooseSelect(admin, 'Tienda', 'PRACTICA');
    await chooseSelectExact(admin, 'Rol', 'Gestor');
    await admin.getByRole('dialog', { name: 'Nuevo usuario' }).getByRole('button', { name: 'Crear usuario' }).click();
    await ack(admin, 'Su invitación');
    await expectStep(admin, 'Listo');
    await admin.getByRole('dialog', { name: 'Invitación lista' }).getByRole('button', { name: 'Listo' }).click();
    await finishLesson(admin);

    // En la práctica el correo se guardó con su marca: el real sigue libre.
    const token = await pageAuthToken(admin);
    const users = await apiJson<Envelope<{ data: { email: string }[] }>>(admin.request, 'get', '/user/list?page=1&limit=100', token);
    const stored = users.body.data.data.map((row) => row.email);
    expect(stored.some((value) => value.startsWith(`carla.${run}+practica-`))).toBe(true);
    expect(stored).not.toContain(email);
  });

  test('15. Tus tiendas', async () => {
    await startLesson(admin, 'stores');
    await openFromMenu(admin, 'Tiendas', '/configuracion/tiendas', 'Configuración');
    await expectStep(admin, 'Agrega una tienda');
    await admin.locator('main button', { hasText: 'Nueva tienda' }).click();
    await expectStep(admin, 'Su código, dirección y horario');
    await admin.fill('#business_code', 'TIENDA-SUR');
    await admin.getByRole('dialog', { name: 'Nueva tienda' }).getByRole('button', { name: 'Crear tienda' }).click();
    await ack(admin, '¡Tienda creada!');
    await finishLesson(admin);
  });

  test('16. Tu flujo de producción', async () => {
    await startLesson(admin, 'production-workflow');
    await openFromMenu(admin, 'Flujo de producción', '/configuracion/flujo-produccion', 'Configuración');
    await ack(admin, 'Tus columnas');
    await expectStep(admin, 'Agrega una columna');
    await admin.locator('main button', { hasText: 'Agregar columna' }).click();
    await expectStep(admin, 'Ponle nombre');
    // Solo la fila nueva está iluminada: se escribe ahí.
    await admin.getByTestId('workflow-stage-row').filter({ hasText: 'Nueva' }).locator('input[placeholder="Nombre de la columna"]').fill('Control de calidad');
    await admin.getByTestId('tutorial-ack').click();
    await expectStep(admin, 'Guarda los cambios');
    await admin.locator('main').getByRole('button', { name: 'Guardar', exact: true }).click();
    await ack(admin, '¡Flujo guardado!');
    await finishLesson(admin);
  });

  test('17. Listas de tu empresa', async () => {
    await startLesson(admin, 'general-variables');
    await openFromMenu(admin, 'Generales', '/configuracion/variables-generales', 'Configuración');
    await expectStep(admin, 'Agrega un valor');
    await admin.locator('main button', { hasText: 'Nueva variable' }).click();
    await expectStep(admin, 'A qué lista y qué valor');
    await admin.locator('#category').click();
    const popover = admin.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill('product_category');
    await popover.locator('[cmdk-item]', { hasText: 'product_category' }).first().click();
    await admin.fill('#title', 'Categoría');
    await admin.fill('#prefix_id', `tazas${run.slice(-4)}`);
    await admin.fill('#name', 'Tazas');
    await admin.getByRole('dialog', { name: 'Nueva variable general' }).getByRole('button', { name: 'Crear variable' }).click();
    await ack(admin, '¡Agregado!');
    await finishLesson(admin);
  });

  test('18. Recordatorios', async () => {
    await startLesson(admin, 'reminders');
    await openFromMenu(admin, 'Recordatorios', '/recordatorios');
    await expectStep(admin, 'Programa un recordatorio');
    await admin.locator('main button', { hasText: 'Nuevo recordatorio' }).click();
    await expectStep(admin, '¿Qué, cuándo y para quién?');
    await admin.fill('#reminder-title', 'Llamar a Comercial Los Andes');
    await admin.fill('#reminder-time', '23:59');
    await admin.getByRole('dialog', { name: 'Nuevo recordatorio' }).getByRole('button', { name: 'Programar recordatorio' }).click();
    await ack(admin, 'Te avisa la campana');
    await finishLesson(admin);
  });

  test('19. Avisos en tu teléfono', async () => {
    await startLesson(admin, 'notifications');
    await expectStep(admin, 'Abre tu perfil');
    await admin.getByRole('button', { name: 'Abrir menú de perfil' }).click();
    await expectStep(admin, 'Notificaciones');
    await admin.locator('[data-radix-popper-content-wrapper]').getByRole('button', { name: 'Notificaciones' }).click();
    await ack(admin, 'Actívalas en tu celular');
    await expectStep(admin, 'Cierra esta ventana');
    await admin.getByRole('dialog', { name: 'Notificaciones en este teléfono' }).getByRole('button', { name: 'Cerrar' }).first().click();
    await finishLesson(admin);
  });

  test('20. Tus almacenes', async () => {
    await startLesson(admin, 'warehouses');
    await openFromMenu(admin, 'Almacenes', '/inventario/almacenes', 'Inventario');
    await expectStep(admin, 'Crea un almacén');
    await admin.locator('main button', { hasText: 'Nuevo almacén' }).click();
    await expectStep(admin, 'Su tienda, código y nombre');
    const dialog = admin.getByRole('dialog', { name: 'Nuevo almacén' });
    await dialog.getByRole('combobox', { name: 'Tienda' }).click();
    await admin.getByRole('option', { name: 'PRACTICA' }).click();
    await dialog.locator('#warehouse-code').fill('PRIN');
    await dialog.locator('#warehouse-name').fill('Almacén principal');
    await dialog.getByRole('button', { name: 'Crear almacén' }).click();
    await ack(admin, '¡Almacén creado!');
    await finishLesson(admin);
  });

  test('21. Entradas de stock y kardex', async () => {
    await startLesson(admin, 'inventory-entry');
    await openFromMenu(admin, 'Movimientos', '/inventario/documentos', 'Inventario');
    await expectStep(admin, 'Registra un ingreso');
    await admin.locator('main').getByRole('button', { name: 'Ingreso', exact: true }).click();
    await expectStep(admin, 'Qué entra y a qué almacén');
    const dialog = admin.getByRole('dialog', { name: 'Nuevo ingreso' });
    await dialog.getByRole('combobox', { name: 'Almacén' }).click();
    await admin.getByRole('option', { name: /Almacén principal/ }).click();
    await dialog.getByRole('combobox', { name: 'Motivo' }).click();
    await admin.getByRole('option', { name: 'Inventario inicial' }).click();
    const line = dialog.getByTestId('document-line').first();
    await line.getByRole('combobox').first().click();
    const popover = admin.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill('Polo de algodón');
    await popover.locator('[cmdk-item]', { hasText: 'Polo de algodón' }).first().click();
    await line.getByLabel('Cantidad de la fila 1').fill('25');
    await line.getByLabel('Costo de la fila 1').fill('9.5');
    await dialog.getByRole('button', { name: 'Guardar y confirmar' }).click();
    await expectStep(admin, 'Cierra el documento');
    await admin.getByRole('dialog', { name: /Ingreso NI01-/ }).getByRole('button', { name: 'Cerrar' }).first().click();
    await openFromMenu(admin, 'Stock', '/inventario/stock', 'Inventario');
    await expect(admin.locator('tr', { hasText: 'Polo de algodón' })).toContainText('25');
    await ack(admin, 'Tu stock al día');
    await openFromMenu(admin, 'Kardex', '/inventario/kardex', 'Inventario');
    await ack(admin, 'El kardex');
    await finishLesson(admin);
  });

  test('22. Vehículos y conductores', async () => {
    await startLesson(admin, 'fleet');
    await openFromMenu(admin, 'Vehículos', '/logistica/vehiculos', 'Logística');
    await expectStep(admin, 'Agrega un vehículo');
    await admin.locator('main button', { hasText: 'Nuevo vehículo' }).click();
    await expectStep(admin, 'Su placa');
    await admin.fill('#vehicle-plate', 'BXK-482');
    await admin.fill('#vehicle-description', 'Furgón blanco');
    await admin.getByRole('dialog', { name: 'Nuevo vehículo' }).getByRole('button', { name: 'Guardar' }).click();
    await openFromMenu(admin, 'Conductores', '/logistica/conductores', 'Logística');
    await expectStep(admin, 'Agrega un conductor');
    await admin.locator('main button', { hasText: 'Nuevo conductor' }).click();
    await expectStep(admin, 'Su documento y su licencia');
    await admin.fill('#driver-doc-number', '41234567');
    await admin.fill('#driver-first-names', 'Rosa');
    await admin.fill('#driver-last-names', 'Huamán');
    await admin.fill('#driver-license', 'Q41234567');
    await admin.getByRole('dialog', { name: 'Nuevo conductor' }).getByRole('button', { name: 'Guardar' }).click();
    await ack(admin, '¡Listos para despachar!');
    await finishLesson(admin);
  });

  test('23. Guía de remisión de un pedido', async () => {
    await startLesson(admin, 'dispatch-guides');
    await openFromMenu(admin, 'Cotizaciones', '/cotizaciones', 'Ventas');
    await openPreparedQuotation(admin);
    await expectStep(admin, 'Arma la guía');
    await detail(admin).getByRole('button', { name: 'Armar guía de remisión' }).click();
    await ack(admin, 'Ya viene llena');
    await expectStep(admin, 'Guarda el borrador');
    await admin.getByTestId('guide-form-dialog').getByRole('button', { name: 'Guardar borrador' }).click();
    await ack(admin, '¡Borrador listo!');
    await finishLesson(admin);
    await expect(admin.getByTestId('course-progress')).toContainText('23 de 33 lecciones');
  });

  test('24. el gestor solo ve lo que su rol puede hacer y practica inventario', async ({ browser }) => {
    await waitForToastsToClear(admin);
    const [gestorContext, gestor] = await newWatchedPage(browser, 'gestor');
    await loginViaUi(gestor, company.gestorEmail, company.password);
    await gestor.goto('/aprender');
    for (const code of ['first-quotation', 'receivables', 'purchase-orders', 'inventory-entry', 'dispatch-guides', 'reminders']) {
      await expect(gestor.getByTestId(`lesson-${code}`), code).toBeVisible();
    }
    for (const code of ['users', 'stores', 'loans', 'employee-debts', 'statistics', 'warehouses', 'fleet', 'cash-closings']) {
      await expect(gestor.getByTestId(`lesson-${code}`), code).toHaveCount(0);
    }
    // Un gestor no crea almacenes: la lección le prepara uno y practica el ingreso.
    await gestor.getByTestId('lesson-inventory-entry').getByRole('button', { name: 'Practicar' }).click();
    await expect(gestor.getByTestId('practice-mode-banner')).toBeVisible({ timeout: 20_000 });
    await openFromMenu(gestor, 'Movimientos', '/inventario/documentos', 'Inventario');
    await expectStep(gestor, 'Registra un ingreso');
    await gestor.locator('main').getByRole('button', { name: 'Ingreso', exact: true }).click();
    const dialog = gestor.getByRole('dialog', { name: 'Nuevo ingreso' });
    await dialog.getByRole('combobox', { name: 'Almacén' }).click();
    await gestor.getByRole('option', { name: /Almacén principal/ }).click();
    await dialog.getByRole('combobox', { name: 'Motivo' }).click();
    await gestor.getByRole('option', { name: 'Inventario inicial' }).click();
    const line = dialog.getByTestId('document-line').first();
    await line.getByRole('combobox').first().click();
    const popover = gestor.locator('[data-slot="popover-content"][data-state="open"]');
    await popover.locator('[cmdk-input]').fill('Taza');
    await popover.locator('[cmdk-item]', { hasText: 'Taza' }).first().click();
    await line.getByLabel('Cantidad de la fila 1').fill('10');
    await line.getByLabel('Costo de la fila 1').fill('4');
    await dialog.getByRole('button', { name: 'Guardar y confirmar' }).click();
    await expectStep(gestor, 'Cierra el documento');
    await gestorContext.close();
  });
});
