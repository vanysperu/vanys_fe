// Cálculo de montos de una cotización, espejo EXACTO del backend (grulla_be:
// utils/numbers.ts -> roundMoney, quotation.model.ts -> computeQuotationIgv /
// computeQuotationTotal, quotation/services/shared/igv_breakdown.ts). Lo usan
// "Nueva cotización" (vista previa antes de guardar) y el detalle, para que
// lo que se ve en pantalla sea céntimo a céntimo lo que dice el PDF.

// Redondeo a 2 decimales con medio céntimo hacia arriba (como SUNAT).
// 374.25 × 1.18 es 441.615, pero en binario llega como 441.61499999999995 y
// un Math.round directo lo bajaba a 441.61: se limpia ese ruido con 15 cifras
// significativas y la coma se corre como texto ("e2"), porque multiplicar
// por 100 lo vuelve a meter (1.005 × 100 = 100.49999999999999).
export function roundMoney(value: number): number {
  const digits = Math.abs(value).toPrecision(15);
  // Notación exponencial: ruido de una resta (ej. 5.55e-17) o un número
  // fuera de rango; ahí no hay medio céntimo que cuidar.
  if (digits.includes('e')) return Math.round(value * 100) / 100;

  const cents = Math.round(Number(`${digits}e2`));
  return Math.sign(value) * Number(`${cents}e-2`);
}

// El IGV se calcula UNA vez sobre el subtotal de toda la cotización.
export function computeQuotationIgv(subtotal: number, includesIgv: boolean, igvRate: number): number {
  return includesIgv ? roundMoney(subtotal * igvRate) : 0;
}

export interface LineIgvAmounts {
  subtotal: number;
  igv: number;
  total: number;
}

const toCents = (amount: number | string): number => Math.round(Number(amount) * 100);

// Reparte el IGV de la cotización entre sus líneas (mayor residuo, en
// céntimos enteros): cada fila cuadra (subtotal + IGV = total), las filas
// suman exactamente el resumen, y si redondear línea por línea ya cuadraba,
// el resultado es ese mismo. Devuelve cada línea original junto a sus montos.
export function allocateIgvByLine<T extends { subtotal: number | string }>(
  lines: T[],
  igvTotal: number,
): Array<{ line: T; amounts: LineIgvAmounts }> {
  const lineCents = lines.map((line) => toCents(line.subtotal));
  const baseCents = lineCents.reduce((sum, cents) => sum + cents, 0);
  const igvCents = baseCents > 0 ? Math.max(toCents(igvTotal), 0) : 0;

  // Parte entera y residuo con aritmética entera (exacta mientras el
  // producto no pase de 2^53: cotizaciones de hasta ~S/ 2 millones).
  const shares = lineCents.map((cents, index) => {
    const product = cents * igvCents;
    const remainder = baseCents > 0 ? product % baseCents : 0;
    return { index, floor: baseCents > 0 ? (product - remainder) / baseCents : 0, remainder };
  });

  const assigned = shares.reduce((sum, share) => sum + share.floor, 0);
  const extraCents = new Set(
    [...shares]
      .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
      .slice(0, Math.max(igvCents - assigned, 0))
      .map((share) => share.index),
  );

  return lines.map((line, index) => {
    const cents = lineCents[index] ?? 0;
    const lineIgvCents = (shares[index]?.floor ?? 0) + (extraCents.has(index) ? 1 : 0);
    return {
      line,
      amounts: { subtotal: cents / 100, igv: lineIgvCents / 100, total: (cents + lineIgvCents) / 100 },
    };
  });
}
