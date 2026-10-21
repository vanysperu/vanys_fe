// Variación de un indicador contra el periodo anterior, lista para mostrar.
export type DeltaDirection = 'up' | 'down' | 'flat';
// good/bad dependen de si "subir" es bueno para ESE indicador (más ventas sí,
// más gastos no).
export type DeltaTone = 'good' | 'bad' | 'neutral';

export interface StatDelta {
  direction: DeltaDirection;
  tone: DeltaTone;
  // Texto completo, sin depender del color: "Subió 12 %", "Bajó 3.5 pts".
  text: string;
}

interface DeltaInput {
  current: number | null;
  previous: number | null;
  // "relative" = cambio porcentual (montos, cantidades); "points" = diferencia
  // en puntos porcentuales (para tasas: 40 % → 45 % es +5 pts, no +12.5 %).
  kind: 'relative' | 'points';
  goodWhen: 'up' | 'down';
}

const percentFormatter = new Intl.NumberFormat('es-PE', { style: 'percent', maximumFractionDigits: 1 });
const pointsFormatter = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 });

// Debajo de este umbral se considera "sin cambios" (ruido de redondeo).
const FLAT_RELATIVE = 0.0005;
const FLAT_POINTS = 0.0005;

const toneFor = (direction: DeltaDirection, goodWhen: 'up' | 'down'): DeltaTone => {
  if (direction === 'flat') return 'neutral';
  return direction === goodWhen ? 'good' : 'bad';
};

const verb = (direction: DeltaDirection) => (direction === 'up' ? 'Subió' : 'Bajó');

// null = no se puede comparar (falta el dato en alguno de los dos periodos,
// o el periodo anterior está en cero: no hay base para un porcentaje).
export function computeStatDelta({ current, previous, kind, goodWhen }: DeltaInput): StatDelta | null {
  if (current === null || previous === null) return null;

  if (kind === 'points') {
    const diff = current - previous;
    if (Math.abs(diff) < FLAT_POINTS) return { direction: 'flat', tone: 'neutral', text: 'Sin cambios' };
    const direction: DeltaDirection = diff > 0 ? 'up' : 'down';
    return {
      direction,
      tone: toneFor(direction, goodWhen),
      text: `${verb(direction)} ${pointsFormatter.format(Math.abs(diff) * 100)} pts`,
    };
  }

  if (previous === 0) {
    return current === 0 ? { direction: 'flat', tone: 'neutral', text: 'Sin cambios' } : null;
  }

  const change = (current - previous) / Math.abs(previous);
  if (Math.abs(change) < FLAT_RELATIVE) return { direction: 'flat', tone: 'neutral', text: 'Sin cambios' };
  const direction: DeltaDirection = change > 0 ? 'up' : 'down';
  return {
    direction,
    tone: toneFor(direction, goodWhen),
    text: `${verb(direction)} ${percentFormatter.format(Math.abs(change))}`,
  };
}
