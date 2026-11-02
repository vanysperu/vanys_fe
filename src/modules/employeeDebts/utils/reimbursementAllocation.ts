import type { ReimbursementDebtLine } from '@/modules/employeeDebts/types/employeeDebt.types';

// Vista previa del reparto de una reposición corregida. Es ESPEJO exacto de
// grulla_be: employee_debt/services/shared/reimbursement_allocation.ts (el
// backend es quien decide; esto solo muestra cómo va a quedar):
//   - bajar el monto: se achica desde la deuda más nueva (LIFO); una deuda
//     que queda en 0 sale del reparto;
//   - subir: primero se completan las deudas que ya cubre (la más antigua
//     primero), después las demás pendientes del trabajador (FIFO).
// En céntimos enteros, como el backend.

export interface AllocationPreviewLine {
  line: ReimbursementDebtLine;
  beforeAmount: number;
  afterAmount: number;
}

export type AllocationPreview =
  | { ok: true; lines: AllocationPreviewLine[] }
  // Lo máximo que puede valer la reposición con lo pendiente de hoy.
  | { ok: false; maxAmount: number };

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

export function previewReallocation(
  allocations: readonly ReimbursementDebtLine[],
  pendingDebts: readonly ReimbursementDebtLine[],
  targetAmount: number,
): AllocationPreview {
  const targetCents = toCents(targetAmount);
  const currentCents = allocations.reduce((sum, line) => sum + toCents(line.allocated_amount), 0);

  if (targetCents <= currentCents) {
    const shrunk = allocations.reduceRight<{ remaining: number; lines: AllocationPreviewLine[] }>(
      (state, line) => {
        const before = toCents(line.allocated_amount);
        const taken = Math.min(before, state.remaining);
        const preview = { line, beforeAmount: fromCents(before), afterAmount: fromCents(before - taken) };
        return { remaining: state.remaining - taken, lines: [preview, ...state.lines] };
      },
      { remaining: currentCents - targetCents, lines: [] },
    );
    return { ok: true, lines: shrunk.lines };
  }

  const slots = [...allocations, ...pendingDebts];
  const maxCents = currentCents + slots.reduce((sum, line) => sum + Math.max(toCents(line.room_amount), 0), 0);
  if (targetCents > maxCents) return { ok: false, maxAmount: fromCents(maxCents) };

  const grown = slots.reduce<{ remaining: number; lines: AllocationPreviewLine[] }>(
    (state, line) => {
      const before = toCents(line.allocated_amount);
      const added = Math.min(Math.max(toCents(line.room_amount), 0), state.remaining);
      const preview = { line, beforeAmount: fromCents(before), afterAmount: fromCents(before + added) };
      return { remaining: state.remaining - added, lines: [...state.lines, preview] };
    },
    { remaining: targetCents - currentCents, lines: [] },
  );
  // Las deudas pendientes que no reciben nada no forman parte del reparto.
  return { ok: true, lines: grown.lines.filter((preview) => preview.beforeAmount > 0 || preview.afterAmount > 0) };
}
