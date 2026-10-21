// Escala "redonda" para el eje de valores de una gráfica: 0 · 10 K · 20 K ·
// 30 K · 40 K en vez de 0 · 9.5 K · 19 K · 28.5 K (los ticks deben ser
// números limpios para leerse de un vistazo).
export interface NiceScale {
  max: number;
  ticks: number[];
}

// Pasos "bonitos" permitidos (× potencia de 10).
const NICE_STEPS = [1, 2, 2.5, 5, 10];

export function niceScale(dataMax: number, targetTicks = 4): NiceScale {
  if (!(dataMax > 0)) return { max: 1, ticks: [0, 1] };

  const roughStep = dataMax / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const niceStep = (NICE_STEPS.find((step) => residual <= step) ?? 10) * magnitude;
  const max = Math.ceil(dataMax / niceStep) * niceStep;

  // Cantidad acotada (≈ targetTicks + 1): nunca un bucle largo.
  const count = Math.round(max / niceStep);
  return { max, ticks: Array.from({ length: count + 1 }, (_, index) => index * niceStep) };
}
