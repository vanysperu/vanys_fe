import { expect, test, type Locator, type Page } from '@playwright/test';

import { ADMIN_STATE } from '../auth';
import { chooseSelect, chooseSelectExact, pickAdultBirthDate, stamp, wordStamp } from '../helpers';

test.use({ storageState: ADMIN_STATE });

// Pedido explícito del usuario: "que los campos tomen la info que deben".
// Cada formulario se crea con TODOS sus campos llenos y, al abrir "editar",
// cada campo debe mostrar exactamente lo guardado (los datos de prueba
// habituales dejan casi todo vacío y no lo cubrían).

const dialog = (page: Page) => page.locator('div[role="dialog"]');

async function openEditFor(page: Page, rowText: string): Promise<Locator> {
  await page.getByPlaceholder('Filtrar...').first().fill(rowText);
  const row = page.locator('tr', { hasText: rowText }).first();
  await expect(row).toBeVisible();
  await row.locator('button:has(svg.lucide-pencil)').first().click();
  await expect(dialog(page)).toBeVisible();
  return dialog(page);
}

// Los precios vuelven del backend como DECIMAL ("12.50"): se comparan como número.
async function expectNumber(field: Locator, expected: number) {
  await expect.poll(async () => Number(await field.inputValue())).toBe(expected);
}

test('cliente: editar muestra todos los datos guardados', async ({ page }) => {
  const name = `QA Cliente Completo ${wordStamp()}`;
  // Único por corrida: un documento fijo chocaba con el de una corrida
  // anterior contra esta misma base (el backend ahora bloquea documentos
  // duplicados en la misma empresa — bug corregido, ver client.validator.ts).
  const documentNumber = `201${stamp()}`;
  await page.goto('/clientes');
  await page.click('button:has-text("Nuevo cliente")');
  await page.fill('#name', name);
  await page.fill('#email', `cliente.${stamp()}@example.test`);
  await page.fill('#phone', '987654321');
  // Tipo y número van juntos (11 dígitos = RUC exacto) — bug corregido,
  // ver client.schema.ts/client.validator.ts.
  await chooseSelect(page, 'Tipo de documento', 'RUC');
  await page.fill('#document_number', documentNumber);
  await page.fill('#address', 'Av. Los Próceres 123, Lima');
  const email = await page.locator('#email').inputValue();
  await page.click('div[role="dialog"] button:has-text("Crear cliente")');
  await expect(page.locator('text=Cliente creado correctamente')).toBeVisible({ timeout: 10_000 });

  const form = await openEditFor(page, name);
  await expect(form.locator('#name')).toHaveValue(name);
  await expect(form.locator('#email')).toHaveValue(email);
  await expect(form.locator('#phone')).toHaveValue('987654321');
  await expect(form.locator('button', { hasText: 'RUC' })).toBeVisible();
  await expect(form.locator('#document_number')).toHaveValue(documentNumber);
  await expect(form.locator('#address')).toHaveValue('Av. Los Próceres 123, Lima');
});

test('producto: editar muestra SKU, los 4 precios, descripción y personalización', async ({ page }) => {
  const suffix = stamp();
  const name = `QA Producto Completo ${suffix}`;
  await page.goto('/productos');
  await page.click('button:has-text("Nuevo producto")');
  await page.fill('#name', name);
  await page.fill('#sku', `QA-FULL-${suffix}`);
  await page.fill('#price_unit', '12.5');
  await page.fill('#price_hundred', '0.9');
  await page.fill('#price_half_thousand', '0.75');
  await page.fill('#price_thousand', '0.6');
  await page.fill('#description', 'Taza blanca de cerámica 11 oz');
  await page.click('#requires_customization');
  await page.click('div[role="dialog"] button:has-text("Crear producto")');
  await expect(page.locator('text=Producto creado correctamente')).toBeVisible({ timeout: 10_000 });

  const form = await openEditFor(page, name);
  await expect(form.locator('#name')).toHaveValue(name);
  await expect(form.locator('#sku')).toHaveValue(`QA-FULL-${suffix}`);
  await expectNumber(form.locator('#price_unit'), 12.5);
  await expectNumber(form.locator('#price_hundred'), 0.9);
  await expectNumber(form.locator('#price_half_thousand'), 0.75);
  await expectNumber(form.locator('#price_thousand'), 0.6);
  await expect(form.locator('#description')).toHaveValue('Taza blanca de cerámica 11 oz');
  await expect(form.locator('#requires_customization')).toHaveAttribute('data-state', 'checked');
});

test('técnica: editar muestra los 4 precios y la descripción', async ({ page }) => {
  const name = `QA Técnica Completa ${stamp()}`;
  await page.goto('/productos/tecnicas');
  await page.click('button:has-text("Nueva técnica")');
  await page.fill('#tech-name', name);
  await page.fill('#tech_price_unit', '1.5');
  await page.fill('#tech_price_hundred', '0.95');
  await page.fill('#tech_price_half_thousand', '0.8');
  await page.fill('#tech_price_thousand', '0.7');
  await page.fill('#tech-description', 'Serigrafía a un color');
  await page.click('div[role="dialog"] button:has-text("Crear técnica")');
  await expect(page.locator('text=creada correctamente').first()).toBeVisible({ timeout: 10_000 });

  const form = await openEditFor(page, name);
  await expect(form.locator('#tech-name')).toHaveValue(name);
  await expectNumber(form.locator('#tech_price_unit'), 1.5);
  await expectNumber(form.locator('#tech_price_hundred'), 0.95);
  await expectNumber(form.locator('#tech_price_half_thousand'), 0.8);
  await expectNumber(form.locator('#tech_price_thousand'), 0.7);
  await expect(form.locator('#tech-description')).toHaveValue('Serigrafía a un color');
});

test('tienda: editar muestra dirección, días laborales y horario', async ({ page }) => {
  const code = `QA-TIENDA-${stamp()}`;
  await page.goto('/configuracion/tiendas');
  await page.click('button:has-text("Nueva tienda")');
  await page.fill('#business_code', code);
  await page.fill('#business-unit-address', 'Jr. Unión 456, Lima');
  for (const day of ['Lun', 'Mar', 'Mié']) {
    await dialog(page).locator('label', { hasText: new RegExp(`^${day}$`) }).click();
  }
  await page.fill('#opens_at', '08:00');
  await page.fill('#closes_at', '18:30');
  await page.click('div[role="dialog"] button:has-text("Crear tienda")');
  await expect(page.locator('text=Tienda creada correctamente')).toBeVisible({ timeout: 10_000 });

  // La columna de empresa muestra el nombre, no "Empresa #<id>".
  await page.getByPlaceholder('Filtrar...').first().fill(code);
  const row = page.locator('tr', { hasText: code }).first();
  await expect(row).toContainText('Acme Corp QA');
  await expect(row).not.toContainText('Empresa #');

  const form = await openEditFor(page, code);
  await expect(form.locator('#business_code')).toHaveValue(code);
  await expect(form.locator('#business-unit-address')).toHaveValue('Jr. Unión 456, Lima');
  for (const [day, state] of [
    ['Lun', 'checked'],
    ['Mar', 'checked'],
    ['Mié', 'checked'],
    ['Jue', 'unchecked'],
  ] as const) {
    await expect(
      form.locator('label', { hasText: new RegExp(`^${day}$`) }).locator('button[role="checkbox"]'),
    ).toHaveAttribute('data-state', state);
  }
  await expect(form.locator('#opens_at')).toHaveValue(/^08:00/);
  await expect(form.locator('#closes_at')).toHaveValue(/^18:30/);
});

test('usuario: editar muestra nombres, documento, género, teléfono, dirección y rol', async ({ page }) => {
  const suffix = stamp();
  const name = `Qaeditar${wordStamp()}`;
  const dni = suffix.padStart(8, '0').slice(-8);
  await page.goto('/seguridad/usuarios');
  await page.click('button:has-text("Nuevo usuario")');
  await page.fill('#name', name);
  await page.fill('#paternal_lastname', 'Prueba');
  await page.fill('#maternal_lastname', 'Completa');
  await page.fill('#email', `usuario.completo.${suffix}@acme.test`);
  await pickAdultBirthDate(page, 'date_of_birth');
  await chooseSelect(page, 'Tipo de documento', 'DNI');
  await page.fill('#document_number', dni);
  await chooseSelect(page, 'Género', 'Femenino');
  await page.fill('#phone_number', '912345678');
  await page.fill('#address', 'Calle Las Flores 789');
  await chooseSelect(page, 'Tienda', 'ACME');
  await chooseSelectExact(page, 'Rol', 'Especialista');
  await page.click('div[role="dialog"] button:has-text("Crear usuario")');
  await expect(page.locator('text=Usuario creado')).toBeVisible({ timeout: 10_000 });

  const form = await openEditFor(page, name);
  await expect(form.locator('#edit-name')).toHaveValue(name);
  await expect(form.locator('#edit-paternal_lastname')).toHaveValue('Prueba');
  await expect(form.locator('#edit-maternal_lastname')).toHaveValue('Completa');
  await expect(form.locator('#edit-email')).toHaveValue(`usuario.completo.${suffix}@acme.test`);
  await expect(form.locator('#edit-document_number')).toHaveValue(dni);
  await expect(form.locator('#edit-phone_number')).toHaveValue('912345678');
  await expect(form.locator('#edit-address')).toHaveValue('Calle Las Flores 789');
  const selects = form.locator('button[role="combobox"]');
  await expect(selects.filter({ hasText: 'DNI' })).toHaveCount(1);
  await expect(selects.filter({ hasText: 'Femenino' })).toHaveCount(1);
  await expect(selects.filter({ hasText: 'Especialista' })).toHaveCount(1);
});

test('cuenta de pago en Generales: crear y editar muestran el número de cuenta', async ({ page }) => {
  const suffix = stamp();
  const name = `QA Cuenta Prefill ${suffix}`;
  await page.goto('/configuracion/variables-generales');
  await page.click('button:has-text("Nueva variable")');
  await page.locator('#category').click();
  const popover = page.locator('[data-slot="popover-content"][data-state="open"]');
  await popover.locator('[cmdk-input]').fill('payment_account');
  await popover.locator('[cmdk-item]', { hasText: /^payment_account$/ }).first().click();
  await page.fill('#title', 'Cuenta');
  await page.fill('#prefix_id', 'bank');
  await page.fill('#name', name);
  // El campo aparece al elegir la categoría (antes no existía en el formulario).
  await page.fill('#ref1', '191-12345678-0-99');
  await page.click('div[role="dialog"] button:has-text("Crear variable")');
  await expect(page.locator('text=Variable creada correctamente')).toBeVisible({ timeout: 10_000 });

  const row = page.locator('tr', { hasText: name });
  await expect(row).toBeVisible();
  await row.locator('button:has(svg.lucide-pencil)').first().click();
  await expect(dialog(page).locator('#ref1')).toHaveValue('191-12345678-0-99');
  await page.keyboard.press('Escape');

  // Limpieza: deshabilitada no sale en los PDF de la empresa QA.
  await row.getByRole('button', { name: 'Deshabilitar variable' }).click();
  await expect(page.locator('text=Variable deshabilitada')).toBeVisible({ timeout: 10_000 });
});
