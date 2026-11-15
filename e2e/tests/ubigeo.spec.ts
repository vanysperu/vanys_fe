import { expect, test } from '@playwright/test';

import { detectUbigeo, findUbigeo, formatUbigeo, loadUbigeoTable, searchUbigeo } from '../../src/lib/ubigeo/ubigeo';

// Ubigeo de la guía de remisión: búsqueda por nombre y detección desde la dirección.
// Son pruebas de la lógica pura (sin navegador); la pantalla se prueba en dispatch-guides.
test.describe('Ubigeo: tabla, búsqueda y detección desde la dirección', () => {
  test('la tabla trae los 1 891 distritos, 196 provincias y 25 departamentos del INEI', async () => {
    const table = await loadUbigeoTable();
    expect(table).toHaveLength(1891);
    expect(new Set(table.map((entry) => entry.code)).size).toBe(1891);
    expect(new Set(table.map((entry) => entry.code.slice(0, 4))).size).toBe(196);
    expect(new Set(table.map((entry) => entry.code.slice(0, 2))).size).toBe(25);
    expect(table.every((entry) => /^\d{6}$/.test(entry.code))).toBe(true);
    expect(formatUbigeo(findUbigeo(table, '150122')!)).toBe('Miraflores, Lima, Lima');
  });

  test('busca por distrito sin tildes ni mayúsculas, por provincia y por código', async () => {
    const table = await loadUbigeoTable();
    expect(searchUbigeo(table, 'miraf')[0]?.code).toBe('150122');
    expect(searchUbigeo(table, 'MIRAFLORES').map((entry) => entry.code)).toEqual(expect.arrayContaining(['150122', '040110', '100506', '151021']));
    // Lima primero: el distrito más grande de los que se llaman igual.
    expect(searchUbigeo(table, 'miraflores')[0]?.code).toBe('150122');
    expect(searchUbigeo(table, 'miraflores arequipa')[0]?.code).toBe('040110');
    expect(searchUbigeo(table, 'jesus maria')[0]?.code).toBe('150113');
    expect(searchUbigeo(table, '1501').length).toBeGreaterThan(20);
    expect(searchUbigeo(table, '   ')).toEqual([]);
    expect(searchUbigeo(table, 'zzzzzz')).toEqual([]);
  });

  const casesWithAnswer: [string, string][] = [
    ['Av. Larco 345, Miraflores, Lima, Lima', '150122'],
    ['Av. Javier Prado Este 1234 San Isidro Lima', '150131'],
    ['Jr. Las Begonias 441 - San Isidro', '150131'],
    ['Calle Los Pinos 123, Surquillo', '150141'],
    ['AV. LA MARINA 2000 SAN MIGUEL, LIMA', '150136'],
    ['Av. Brasil 1500, Jesús María', '150113'],
    ['Av. Primavera 100, Santiago de Surco', '150140'],
    ['Av. Primavera 100, Surco', '150140'],
    ['Av. Santa Rosa 123, Surquillo', '150141'],
    ['Av. Túpac Amaru 2500, Comas, Lima', '150110'],
    ['Av. Grau 100, Miraflores, Arequipa', '040110'],
    ['Plaza de Armas s/n, Miraflores - Yauyos', '151021'],
    ['Jr. de la Unión 500, Cercado de Lima', '150101'],
    ['Av. Argentina 3000, Callao, Bellavista', '070102'],
    ['Av. Los Olivos 100, Los Olivos', '150117'],
  ];
  for (const [address, expected] of casesWithAnswer) {
    test(`detecta solo: ${address}`, async () => {
      const table = await loadUbigeoTable();
      expect(detectUbigeo(table, address).best?.code).toBe(expected);
    });
  }

  test('ante la duda NO rellena solo y ofrece opciones, el distrito más grande primero', async () => {
    const table = await loadUbigeoTable();
    // Miraflores existe en Lima, Arequipa, Huánuco y Yauyos y la dirección no dice cuál.
    const ambiguous = detectUbigeo(table, 'Av. Larco 345, Miraflores');
    expect(ambiguous.best).toBeNull();
    expect(ambiguous.candidates[0]?.code).toBe('150122');
    expect(ambiguous.candidates.length).toBeGreaterThan(1);
    // San Miguel: Lima (190 mil) y Puno (80 mil) son comparables, hay que elegir.
    const sanMiguel = detectUbigeo(table, 'AV. LA MARINA 2000 SAN MIGUEL');
    expect(sanMiguel.best).toBeNull();
    expect(sanMiguel.candidates[0]?.code).toBe('150136');
    // Solo se nombra la ciudad: puede ser el Cercado o cualquier otro distrito.
    const cityOnly = detectUbigeo(table, 'Av. Abancay 123, Lima');
    expect(cityOnly.best).toBeNull();
    expect(cityOnly.candidates.map((entry) => entry.code)).toContain('150101');
    // Nombre corto pegado a la calle: se confunde con otra palabra, no se rellena solo.
    expect(detectUbigeo(table, 'Calle Mala 123').best).toBeNull();
    // Nombre corto pero separado con coma: sí.
    expect(detectUbigeo(table, 'Calle Los Cedros 123, Ate').best?.code).toBe('150103');
  });

  test('sin distrito en la dirección no inventa nada', async () => {
    const table = await loadUbigeoTable();
    for (const address of ['', 'Av. Larco 345', 'S/N', 'Jr. sin nombre 12 mz B lote 4']) {
      expect(detectUbigeo(table, address)).toEqual({ best: null, candidates: [] });
    }
  });
});
