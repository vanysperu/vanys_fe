import { ArrowRight, Equal, Minus, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import type { CashPeriodTotals } from '@/modules/cashClosings/types/cashClosings.types';
import { formatMoney } from '@/modules/moneyCorrections/utils/correctionChanges';
import { StatTile } from '@/presentation/components/shared/StatTile';

interface CashBalanceEquationProps {
  totals: CashPeriodTotals;
  isPreview: boolean;
}

// Los cinco números del mes, en el orden en que se leen:
// Saldo inicial → + Ingresos → − Egresos → ± Ajustes → = Saldo final.
// Pensado para quien no es contador: cada paso lleva su símbolo y una frase.
//
// Diseño responsive por ANCHO DEL PANEL (container queries, @container), no
// de la ventana: la ecuación vive en el panel de detalle, que a 1440px mide
// ~640px — con breakpoints de ventana (xl) se armaba la fila de 5 fichas y
// los montos se partían carácter por carácter. Una sola fila (con flechas/
// operadores) solo cuando el panel mide ≥ 56rem; debajo, 2 columnas (3 desde
// 32rem) sin operadores, porque cada etiqueta ya lleva su signo (+, −, ±, =).
// Las fichas son min-w-0 + overflow-wrap:anywhere solo como último recurso
// para un monto enorme.
const TILE_CLASS = 'min-w-0 [overflow-wrap:anywhere]';

export function CashBalanceEquation({ totals, isPreview }: CashBalanceEquationProps) {
  return (
    <div className="@container space-y-2" data-testid="cash-balance-equation">
      <div className="grid grid-cols-2 items-stretch gap-2 @lg:grid-cols-3 @4xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
        <StatTile label="Saldo inicial" value={formatMoney(totals.opening)} caption="Lo que había al empezar" className={TILE_CLASS} />
        <Operator icon={<ArrowRight className="size-4" />} />
        <StatTile
          label="+ Ingresos"
          value={formatMoney(totals.income)}
          caption="Lo que entró"
          className={cn(TILE_CLASS, '[&_p:nth-child(2)]:text-[var(--success)]')}
        />
        <Operator icon={<Minus className="size-4" />} />
        <StatTile
          label="− Egresos"
          value={formatMoney(totals.expense)}
          caption="Lo que salió"
          className={cn(TILE_CLASS, '[&_p:nth-child(2)]:text-destructive')}
        />
        <Operator icon={<PlusMinus />} />
        <StatTile label="± Ajustes" value={formatMoney(totals.adjustments)} caption="Correcciones de meses cerrados" className={TILE_CLASS} />
        <Operator icon={<Equal className="size-4" />} />
        <StatTile
          label="= Saldo final"
          value={formatMoney(totals.closing)}
          caption={isPreview ? 'Vista previa' : 'Lo que quedó'}
          // 2 columnas: ocupa la fila entera; 3 columnas: queda junto a Ajustes
          // ocupando las 2 restantes; fila completa: una pista más.
          className={cn(
            TILE_CLASS,
            'col-span-2 @4xl:col-span-1',
            totals.closing < 0 && '[&_p:nth-child(2)]:text-destructive',
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Lo que había al empezar el mes, más lo que entró, menos lo que salió, más o menos las correcciones de meses ya
        cerrados.
        {isPreview && <span className="font-medium text-foreground"> Vista previa (aún no cerrado).</span>}
      </p>
    </div>
  );
}

function Operator({ icon }: { icon: ReactNode }) {
  return (
    <div className="hidden items-center justify-center text-muted-foreground @4xl:flex" aria-hidden>
      {icon}
    </div>
  );
}

// Símbolo "±" (lucide no trae uno): un más y un menos apilados.
function PlusMinus() {
  return (
    <span className="flex flex-col items-center leading-none">
      <Plus className="size-3" />
      <Minus className="size-3" />
    </span>
  );
}
